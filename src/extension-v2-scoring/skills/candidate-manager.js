/**
 * Job Filter - Candidate Manager (v2 Upgrade)
 *
 * Manages the "candidates" bucket - skills/tools that couldn't be confidently
 * classified and need human review or feedback.
 *
 * Features:
 * - Stores candidates with evidence and confidence scores
 * - Tracks user feedback (accept/reject/classify)
 * - Learns from feedback to improve classification over time
 * - Provides export for updating dictionaries
 */

// ============================================================================
// CANDIDATE BUCKET MANAGEMENT
// ============================================================================

/**
 * Create a candidate item
 * @param {string} raw - Raw extracted phrase
 * @param {Object} options - Candidate options
 * @returns {Object} Candidate item
 */
function createCandidate(raw, options = {}) {
  const {
    inferredType = 'UNKNOWN',
    confidence = 0.35,
    evidence = 'No clear classification',
    sourceLocation = 'unknown',
    context = null
  } = options;

  return {
    raw,
    canonical: raw.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
    inferredType,
    confidence,
    evidence,
    sourceLocation,
    context,
    timestamp: Date.now(),
    userFeedback: null
  };
}

/**
 * Add candidates to storage
 * @param {Array} candidates - Array of candidate items
 * @returns {Promise<void>}
 */
async function storeCandidates(candidates) {
  if (!candidates || candidates.length === 0) {
    return;
  }

  try {
    // Get existing candidates from storage
    const storage = await chrome.storage.local.get(['candidateSkills']);
    const existing = storage.candidateSkills || [];

    // Merge new candidates (avoid duplicates)
    const canonicalSet = new Set(existing.map(c => c.canonical));
    const newCandidates = candidates.filter(c => !canonicalSet.has(c.canonical));

    const merged = [...existing, ...newCandidates];

    // Store back
    await chrome.storage.local.set({ candidateSkills: merged });

    console.log(`[CandidateManager] Stored ${newCandidates.length} new candidates (total: ${merged.length})`);
  } catch (error) {
    console.error('[CandidateManager] Failed to store candidates:', error);
  }
}

/**
 * Get all candidates from storage
 * @returns {Promise<Array>} Array of candidates
 */
async function getCandidates() {
  try {
    const storage = await chrome.storage.local.get(['candidateSkills']);
    return storage.candidateSkills || [];
  } catch (error) {
    console.error('[CandidateManager] Failed to get candidates:', error);
    return [];
  }
}

/**
 * Update candidate with user feedback
 * @param {string} canonical - Canonical key of candidate
 * @param {Object} feedback - User feedback
 * @returns {Promise<boolean>} Success status
 */
async function updateCandidateFeedback(canonical, feedback) {
  try {
    const candidates = await getCandidates();
    const candidateIndex = candidates.findIndex(c => c.canonical === canonical);

    if (candidateIndex === -1) {
      console.warn(`[CandidateManager] Candidate not found: ${canonical}`);
      return false;
    }

    // Update feedback
    candidates[candidateIndex].userFeedback = {
      action: feedback.action, // 'accept', 'reject', 'classify'
      classifiedAs: feedback.classifiedAs, // 'CORE_SKILL', 'TOOL', or null
      note: feedback.note || null,
      timestamp: Date.now()
    };

    // Store updated candidates
    await chrome.storage.local.set({ candidateSkills: candidates });

    // If user classified, add to appropriate dictionary
    if (feedback.action === 'classify' && feedback.classifiedAs) {
      await promoteToDictionary(candidates[candidateIndex], feedback.classifiedAs);
    }

    console.log(`[CandidateManager] Updated feedback for: ${canonical}`);
    return true;
  } catch (error) {
    console.error('[CandidateManager] Failed to update feedback:', error);
    return false;
  }
}

/**
 * Promote candidate to skills or tools dictionary
 * @param {Object} candidate - Candidate item
 * @param {string} type - 'CORE_SKILL' or 'TOOL'
 * @returns {Promise<boolean>} Success status
 */
async function promoteToDictionary(candidate, type) {
  try {
    // Get current user extensions
    const storage = await chrome.storage.local.get(['userSkillExtensions', 'userToolExtensions']);

    if (type === 'CORE_SKILL') {
      const extensions = storage.userSkillExtensions || [];
      extensions.push({
        name: candidate.raw,
        canonical: candidate.canonical,
        category: 'User Added',
        aliases: [],
        addedAt: Date.now()
      });
      await chrome.storage.local.set({ userSkillExtensions: extensions });
    } else if (type === 'TOOL') {
      const extensions = storage.userToolExtensions || [];
      extensions.push({
        name: candidate.raw,
        canonical: candidate.canonical,
        category: 'User Added',
        type: 'tool',
        aliases: [],
        addedAt: Date.now()
      });
      await chrome.storage.local.set({ userToolExtensions: extensions });
    }

    console.log(`[CandidateManager] Promoted ${candidate.raw} to ${type}`);
    return true;
  } catch (error) {
    console.error('[CandidateManager] Failed to promote candidate:', error);
    return false;
  }
}

/**
 * Remove candidate from storage
 * @param {string} canonical - Canonical key of candidate
 * @returns {Promise<boolean>} Success status
 */
async function removeCandidate(canonical) {
  try {
    const candidates = await getCandidates();
    const filtered = candidates.filter(c => c.canonical !== canonical);

    await chrome.storage.local.set({ candidateSkills: filtered });

    console.log(`[CandidateManager] Removed candidate: ${canonical}`);
    return true;
  } catch (error) {
    console.error('[CandidateManager] Failed to remove candidate:', error);
    return false;
  }
}

// ============================================================================
// CANDIDATE ANALYSIS
// ============================================================================

/**
 * Get candidates grouped by inferred type
 * @returns {Promise<Object>} Grouped candidates
 */
async function getCandidatesGrouped() {
  const candidates = await getCandidates();

  const grouped = {
    inferredTools: [],
    inferredSkills: [],
    unknown: [],
    stats: {
      total: candidates.length,
      withFeedback: candidates.filter(c => c.userFeedback).length,
      needsReview: candidates.filter(c => !c.userFeedback).length
    }
  };

  for (const candidate of candidates) {
    if (candidate.inferredType === 'TOOL') {
      grouped.inferredTools.push(candidate);
    } else if (candidate.inferredType === 'CORE_SKILL') {
      grouped.inferredSkills.push(candidate);
    } else {
      grouped.unknown.push(candidate);
    }
  }

  return grouped;
}

/**
 * Get candidates sorted by confidence (lowest first)
 * @param {number} limit - Maximum candidates to return
 * @returns {Promise<Array>} Sorted candidates
 */
async function getCandidatesByConfidence(limit = 50) {
  const candidates = await getCandidates();

  // Filter out candidates with feedback
  const needsReview = candidates.filter(c => !c.userFeedback);

  // Sort by confidence (lowest first) - these need review most
  const sorted = needsReview.sort((a, b) => a.confidence - b.confidence);

  return sorted.slice(0, limit);
}

/**
 * Get candidates by frequency (most common first)
 * @returns {Promise<Array>} Candidates with occurrence counts
 */
async function getCandidatesByFrequency() {
  const candidates = await getCandidates();

  // Count occurrences by canonical
  const frequencyMap = new Map();

  for (const candidate of candidates) {
    const count = frequencyMap.get(candidate.canonical) || 0;
    frequencyMap.set(candidate.canonical, count + 1);
  }

  // Sort by frequency
  const sorted = candidates
    .map(c => ({
      ...c,
      occurrences: frequencyMap.get(c.canonical) || 1
    }))
    .sort((a, b) => b.occurrences - a.occurrences);

  // Deduplicate by canonical
  const deduped = [];
  const seen = new Set();

  for (const candidate of sorted) {
    if (!seen.has(candidate.canonical)) {
      seen.add(candidate.canonical);
      deduped.push(candidate);
    }
  }

  return deduped;
}

// ============================================================================
// EXPORT & IMPORT
// ============================================================================

/**
 * Export candidates for dictionary updates
 * @param {boolean} includeRejected - Include rejected candidates
 * @returns {Promise<Object>} Export data
 */
async function exportCandidates(includeRejected = false) {
  const candidates = await getCandidates();

  const filtered = includeRejected
    ? candidates
    : candidates.filter(c => !c.userFeedback || c.userFeedback.action !== 'reject');

  const exportData = {
    exportedAt: Date.now(),
    version: '1.0',
    candidates: filtered.map(c => ({
      raw: c.raw,
      canonical: c.canonical,
      inferredType: c.inferredType,
      confidence: c.confidence,
      evidence: c.evidence,
      userFeedback: c.userFeedback
    })),
    stats: {
      total: filtered.length,
      classified: filtered.filter(c => c.userFeedback?.classifiedAs).length,
      rejected: filtered.filter(c => c.userFeedback?.action === 'reject').length,
      pending: filtered.filter(c => !c.userFeedback).length
    }
  };

  return exportData;
}

/**
 * Clear all candidates (with confirmation)
 * @param {boolean} confirmed - User confirmation
 * @returns {Promise<boolean>} Success status
 */
async function clearCandidates(confirmed = false) {
  if (!confirmed) {
    console.warn('[CandidateManager] Clear candidates requires confirmation');
    return false;
  }

  try {
    await chrome.storage.local.set({ candidateSkills: [] });
    console.log('[CandidateManager] Cleared all candidates');
    return true;
  } catch (error) {
    console.error('[CandidateManager] Failed to clear candidates:', error);
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.CandidateManager = {
    createCandidate,
    storeCandidates,
    getCandidates,
    updateCandidateFeedback,
    promoteToDictionary,
    removeCandidate,
    getCandidatesGrouped,
    getCandidatesByConfidence,
    getCandidatesByFrequency,
    exportCandidates,
    clearCandidates
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createCandidate,
    storeCandidates,
    getCandidates,
    updateCandidateFeedback,
    promoteToDictionary,
    removeCandidate,
    getCandidatesGrouped,
    getCandidatesByConfidence,
    getCandidatesByFrequency,
    exportCandidates,
    clearCandidates
  };
}
