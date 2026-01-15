/**
 * Job Filter - Profile Setup Script
 *
 * Handles the user profile onboarding flow:
 * - Multi-tab form navigation
 * - Tag input components for skills/industries/roles
 * - Validation and storage of profile to chrome.storage.local
 * - Load existing profile for editing
 */

// ============================================================================
// STORAGE KEY - Must match other extension files
// ============================================================================

const PROFILE_STORAGE_KEY = 'jh_user_profile';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Current profile data being edited
 * Structure matches the spec in CLAUDE.md
 */
let profileData = {
  version: '1.2',
  preferences: {
    salary_floor: 150000,
    salary_target: 200000,
    bonus_preference: 'preferred',
    equity_preference: 'optional',
    workplace_types_acceptable: ['remote'],
    workplace_types_unacceptable: ['on_site'],
    employment_type_preferred: 'full_time',
    employment_types_acceptable: ['full_time'],
    deal_breakers: ['on_site', 'less_than_150k_base'],
    must_haves: [],
    benefits: []
  },
  background: {
    current_title: '',
    years_experience: 0,
    core_skills: [],
    industries: [],
    target_roles: []
  },
  constraints: {
    cannot_accept: '',
    avoid_unless_exceptional: '',
    reject_if: ''
  },
  last_updated: null
};

// Tag input state (arrays of current tags)
let skillTags = [];
let industryTags = [];
let roleTags = [];
let benefitsTags = [];

// Limits
const MAX_TAGS_PER_FIELD = 30;

// DOM element cache
let elements = {};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the profile setup page when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Cache DOM element references
  cacheElements();

  // Set up event listeners
  setupTabNavigation();
  setupTagInputs();
  setupSuggestedTags();
  setupFormSubmission();
  setupRealTimeCountUpdates(); // NEW: Add real-time count updates for checkboxes

  // Load existing profile if available
  await loadExistingProfile();

  // Initialize all counts
  updateAllCounts();

  console.log('[Profile Setup] Initialized');
});

/**
 * Set up real-time count updates for checkboxes and other form elements
 * Updates counts immediately as user changes selections
 */
function setupRealTimeCountUpdates() {
  // Dealbreaker checkboxes
  const dealBreakerCheckboxes = document.querySelectorAll('input[name="deal_breakers"]');
  dealBreakerCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      updateDealBreakerCount();
    });
  });

  // Must-have checkboxes
  const mustHaveCheckboxes = document.querySelectorAll('input[name="must_haves"]');
  mustHaveCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      updateMustHaveCount();
    });
  });

  // Workplace type checkboxes
  const workplaceCheckboxes = document.querySelectorAll('input[name="workplace_types_acceptable"]');
  workplaceCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      updateWorkplaceCount();
    });
  });

  console.log('[Profile Setup] Real-time count updates configured');
}

/**
 * Update all count displays
 */
function updateAllCounts() {
  updateTagCount('skills');
  updateTagCount('industries');
  updateTagCount('roles');
  updateTagCount('benefits');
  updateDealBreakerCount();
  updateMustHaveCount();
  updateWorkplaceCount();
}

/**
 * Update deal-breaker count display
 */
function updateDealBreakerCount() {
  const checkedCount = document.querySelectorAll('input[name="deal_breakers"]:checked').length;
  const countDisplay = document.getElementById('dealbreaker-count');
  if (countDisplay) {
    countDisplay.textContent = checkedCount;
    countDisplay.classList.toggle('has-items', checkedCount > 0);
  }
  console.log('[Profile Setup] Deal-breakers count updated:', checkedCount);
}

/**
 * Update must-have count display
 */
function updateMustHaveCount() {
  const checkedCount = document.querySelectorAll('input[name="must_haves"]:checked').length;
  const countDisplay = document.getElementById('musthave-count');
  if (countDisplay) {
    countDisplay.textContent = checkedCount;
    countDisplay.classList.toggle('has-items', checkedCount > 0);
  }
  console.log('[Profile Setup] Must-haves count updated:', checkedCount);
}

/**
 * Update workplace types count display
 */
function updateWorkplaceCount() {
  const checkedCount = document.querySelectorAll('input[name="workplace_types_acceptable"]:checked').length;
  const countDisplay = document.getElementById('workplace-count');
  if (countDisplay) {
    countDisplay.textContent = checkedCount;
    countDisplay.classList.toggle('has-items', checkedCount > 0);
  }
  console.log('[Profile Setup] Workplace types count updated:', checkedCount);
}

/**
 * Cache frequently used DOM elements
 */
function cacheElements() {
  elements = {
    form: document.getElementById('profile-form'),
    statusMessage: document.getElementById('status-message'),
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    // Tab 1: Preferences
    salaryFloor: document.getElementById('salary-floor'),
    salaryTarget: document.getElementById('salary-target'),
    bonusPreference: document.getElementById('bonus-preference'),
    equityPreference: document.getElementById('equity-preference'),
    employmentType: document.getElementById('employment-type'),
    // Tab 2: Background
    currentTitle: document.getElementById('current-title'),
    yearsExperience: document.getElementById('years-experience'),
    skillsInput: document.getElementById('core-skills'),
    skillsTags: document.getElementById('skills-tags'),
    industriesInput: document.getElementById('industries'),
    industriesTags: document.getElementById('industries-tags'),
    rolesInput: document.getElementById('target-roles'),
    rolesTags: document.getElementById('roles-tags'),
    benefitsInput: document.getElementById('preferred-benefits'),
    benefitsTags: document.getElementById('benefits-tags')
  };
}

// ============================================================================
// TAB NAVIGATION
// ============================================================================

/**
 * Set up tab navigation click handlers
 */
function setupTabNavigation() {
  // Tab button clicks
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      switchToTab(targetTab);
    });
  });

  // Next/Previous button clicks
  document.querySelectorAll('[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextTab = btn.dataset.next;
      switchToTab(nextTab);
    });
  });

  document.querySelectorAll('[data-prev]').forEach(btn => {
    btn.addEventListener('click', () => {
      const prevTab = btn.dataset.prev;
      switchToTab(prevTab);
    });
  });
}

/**
 * Switch to a specific tab
 * @param {string} tabId - The tab ID to switch to
 */
function switchToTab(tabId) {
  // Update tab buttons
  elements.tabs.forEach(tab => {
    if (tab.dataset.tab === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Update tab content visibility
  elements.tabContents.forEach(content => {
    if (content.id === `tab-${tabId}`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });

  // Scroll to top of form
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// TAG INPUT COMPONENTS
// ============================================================================

// Maximum tags allowed per category
const TAG_LIMIT = 30;

// Maps for tracking tag input configurations
const tagInputConfigs = {
  skills: { tags: () => skillTags, setTags: (t) => { skillTags = t; }, suggestedAttr: 'data-skill' },
  industries: { tags: () => industryTags, setTags: (t) => { industryTags = t; }, suggestedAttr: 'data-industry' },
  roles: { tags: () => roleTags, setTags: (t) => { roleTags = t; }, suggestedAttr: 'data-role' },
  benefits: { tags: () => benefitsTags, setTags: (t) => { benefitsTags = t; }, suggestedAttr: 'data-benefit' }
};

/**
 * Set up tag input functionality for skills, industries, and roles
 */
function setupTagInputs() {
  // Skills tag input
  setupTagInput(
    elements.skillsInput,
    elements.skillsTags,
    () => skillTags,
    (tags) => { skillTags = tags; syncSuggestedTags('skills'); updateTagCount('skills'); },
    'skills'
  );

  // Industries tag input
  setupTagInput(
    elements.industriesInput,
    elements.industriesTags,
    () => industryTags,
    (tags) => { industryTags = tags; syncSuggestedTags('industries'); updateTagCount('industries'); },
    'industries'
  );

  // Target roles tag input
  setupTagInput(
    elements.rolesInput,
    elements.rolesTags,
    () => roleTags,
    (tags) => { roleTags = tags; syncSuggestedTags('roles'); updateTagCount('roles'); },
    'roles'
  );

  // Benefits tag input
  setupTagInput(
    elements.benefitsInput,
    elements.benefitsTags,
    () => benefitsTags,
    (tags) => { benefitsTags = tags; syncSuggestedTags('benefits'); updateTagCount('benefits'); },
    'benefits'
  );

  // Initialize tag counts
  updateTagCount('skills');
  updateTagCount('industries');
  updateTagCount('roles');
  updateTagCount('benefits');
}

/**
 * Update the tag count display for a category
 * @param {string} category - 'skills', 'industries', or 'roles'
 */
function updateTagCount(category) {
  const config = tagInputConfigs[category];
  if (!config) return;

  const tags = config.tags();
  const container = category === 'skills' ? elements.skillsTags :
                   category === 'industries' ? elements.industriesTags :
                   category === 'roles' ? elements.rolesTags :
                   elements.benefitsTags;

  // Find or create count element
  const tagInputContainer = container.closest('.tag-input-container');
  if (!tagInputContainer) return;

  let countEl = tagInputContainer.querySelector('.tag-count');
  if (!countEl) {
    countEl = document.createElement('span');
    countEl.className = 'tag-count';
    tagInputContainer.appendChild(countEl);
  }

  countEl.textContent = `${tags.length}/${TAG_LIMIT}`;
  countEl.classList.toggle('at-limit', tags.length >= TAG_LIMIT);
}

/**
 * Show inline validation message near the input
 * @param {HTMLElement} input - The input element
 * @param {string} message - Message to show (empty to hide)
 */
function showInlineValidation(input, message) {
  const tagInputContainer = input.closest('.tag-input-container');
  if (!tagInputContainer) return;

  // Find or create validation element
  let validationEl = tagInputContainer.querySelector('.inline-validation');
  if (!validationEl) {
    validationEl = document.createElement('div');
    validationEl.className = 'inline-validation';
    tagInputContainer.after(validationEl);
  }

  if (message) {
    validationEl.textContent = message;
    validationEl.classList.add('show');
    // Auto-hide after 3 seconds
    setTimeout(() => {
      validationEl.classList.remove('show');
    }, 3000);
  } else {
    validationEl.classList.remove('show');
  }
}

/**
 * Normalize a tag value for comparison (case-insensitive, trim)
 * @param {string} tag - Tag to normalize
 * @returns {string} Normalized tag
 */
function normalizeTagForComparison(tag) {
  return (tag || '').toLowerCase().trim();
}

/**
 * Check if a tag already exists in the array (case-insensitive)
 * @param {string[]} tags - Existing tags
 * @param {string} newTag - Tag to check
 * @returns {boolean} True if exists
 */
function tagExists(tags, newTag) {
  const normalized = normalizeTagForComparison(newTag);
  return tags.some(t => normalizeTagForComparison(t) === normalized);
}

/**
 * Set up a single tag input component
 * @param {HTMLInputElement} input - The text input element
 * @param {HTMLElement} container - The container for rendered tags
 * @param {Function} getTags - Function to get current tags array
 * @param {Function} updateTags - Callback to update the tags array
 * @param {string} category - Category name for syncing
 */
function setupTagInput(input, container, getTags, updateTags, category) {
  if (!input || !container) return;

  // Handle Enter key to add tag (supports comma-delimited bulk on Enter)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = input.value.trim();
      const tags = getTags();

      // Check limit
      if (tags.length >= TAG_LIMIT) {
        showInlineValidation(input, `Maximum ${TAG_LIMIT} items reached. Remove some to add more.`);
        return;
      }

      // Check for duplicates (case-insensitive)
      if (value && !tagExists(tags, value)) {
        const newTags = [...tags, value];
        updateTags(newTags);
        renderTags(container, newTags, updateTags, category);
        input.value = '';
        showInlineValidation(input, ''); // Clear any validation message
      } else if (value && tagExists(tags, value)) {
        showInlineValidation(input, 'This item already exists.');
      }
    }

    // Handle Backspace to remove last tag
    if (e.key === 'Backspace' && input.value === '' && getTags().length > 0) {
      const tags = getTags();
      const newTags = tags.slice(0, -1);
      updateTags(newTags);
      renderTags(container, newTags, updateTags, category);
    }
  });

  // Handle comma as delimiter
  input.addEventListener('input', (e) => {
    const value = input.value;
    if (value.includes(',')) {
      const parts = value.split(',').map(p => p.trim()).filter(Boolean);
      const tags = getTags();
      const newTags = [...tags];
      let addedCount = 0;

      parts.forEach(part => {
        if (newTags.length >= TAG_LIMIT) {
          return; // Skip if at limit
        }
        if (part && !tagExists(newTags, part)) {
          newTags.push(part);
          addedCount++;
        }
      });

      if (newTags.length > tags.length) {
        updateTags(newTags);
        renderTags(container, newTags, updateTags, category);
      }

      if (newTags.length >= TAG_LIMIT) {
        showInlineValidation(input, `Maximum ${TAG_LIMIT} items reached.`);
      }

      input.value = '';
    }
  });
}

/**
 * Render tags in a container
 * @param {HTMLElement} container - The container element
 * @param {string[]} tags - Array of tags to render
 * @param {Function} updateTags - Callback when tags change
 * @param {string} category - Category for syncing suggested tags
 */
function renderTags(container, tags, updateTags, category) {
  container.innerHTML = tags.map((tag, index) => `
    <span class="tag" data-tag-value="${escapeHtml(tag)}">
      ${escapeHtml(formatTagDisplay(tag))}
      <button type="button" class="remove-tag" data-index="${index}" title="Remove">&times;</button>
    </span>
  `).join('');

  // Add click handlers for remove buttons
  container.querySelectorAll('.remove-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index, 10);
      const currentTags = category === 'skills' ? skillTags :
                         category === 'industries' ? industryTags :
                         category === 'roles' ? roleTags :
                         benefitsTags;
      const newTags = currentTags.filter((_, i) => i !== index);
      updateTags(newTags);
      renderTags(container, newTags, updateTags, category);
    });
  });

  // Sync suggested tags after render
  if (category) {
    syncSuggestedTags(category);
  }
}

/**
 * Format tag for display (convert snake_case to Title Case)
 * @param {string} tag - Raw tag value
 * @returns {string} Formatted display value
 */
function formatTagDisplay(tag) {
  return tag
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// SUGGESTED TAGS
// ============================================================================

/**
 * Sync suggested tag button states based on current tags
 * Handles both exact matches and manually typed values that match suggestions
 * @param {string} category - 'skills', 'industries', or 'roles'
 */
function syncSuggestedTags(category) {
  const config = tagInputConfigs[category];
  if (!config) return;

  const tags = config.tags();
  const attrName = config.suggestedAttr;

  // Get all suggested buttons for this category
  const buttons = document.querySelectorAll(`.suggested-tag[${attrName}]`);

  buttons.forEach(btn => {
    const suggestedValue = btn.getAttribute(attrName);
    const displayText = btn.textContent.trim();

    // Check if the suggested value OR its display text is in current tags
    // Use case-insensitive and exact match only (no partial matching)
    const isUsed = tags.some(tag => {
      const normalizedTag = normalizeTagForComparison(tag);
      const normalizedSuggested = normalizeTagForComparison(suggestedValue);
      const normalizedDisplay = normalizeTagForComparison(displayText);

      // Exact match only - no partial matching
      return normalizedTag === normalizedSuggested || normalizedTag === normalizedDisplay;
    });

    if (isUsed) {
      btn.classList.add('used');
    } else {
      btn.classList.remove('used');
    }
  });
}

/**
 * Set up click handlers for suggested tag buttons
 */
function setupSuggestedTags() {
  // Skill suggestions
  document.querySelectorAll('.suggested-tag[data-skill]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('used')) return;
      if (skillTags.length >= TAG_LIMIT) {
        showInlineValidation(elements.skillsInput, `Maximum ${TAG_LIMIT} items reached.`);
        return;
      }

      const skill = btn.dataset.skill;
      if (!tagExists(skillTags, skill)) {
        skillTags.push(skill);
        renderTags(elements.skillsTags, skillTags, (tags) => { skillTags = tags; syncSuggestedTags('skills'); updateTagCount('skills'); }, 'skills');
        updateTagCount('skills');
      }
    });
  });

  // Industry suggestions
  document.querySelectorAll('.suggested-tag[data-industry]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('used')) return;
      if (industryTags.length >= TAG_LIMIT) {
        showInlineValidation(elements.industriesInput, `Maximum ${TAG_LIMIT} items reached.`);
        return;
      }

      const industry = btn.dataset.industry;
      if (!tagExists(industryTags, industry)) {
        industryTags.push(industry);
        renderTags(elements.industriesTags, industryTags, (tags) => { industryTags = tags; syncSuggestedTags('industries'); updateTagCount('industries'); }, 'industries');
        updateTagCount('industries');
      }
    });
  });

  // Role suggestions
  document.querySelectorAll('.suggested-tag[data-role]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('used')) return;
      if (roleTags.length >= TAG_LIMIT) {
        showInlineValidation(elements.rolesInput, `Maximum ${TAG_LIMIT} items reached.`);
        return;
      }

      const role = btn.dataset.role;
      if (!tagExists(roleTags, role)) {
        roleTags.push(role);
        renderTags(elements.rolesTags, roleTags, (tags) => { roleTags = tags; syncSuggestedTags('roles'); updateTagCount('roles'); }, 'roles');
        updateTagCount('roles');
      }
    });
  });

  // Benefits suggestions
  document.querySelectorAll('.suggested-tag[data-benefit]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('used')) return;
      if (benefitsTags.length >= TAG_LIMIT) {
        showInlineValidation(elements.benefitsInput, `Maximum ${TAG_LIMIT} items reached.`);
        return;
      }

      const benefit = btn.dataset.benefit;
      if (!tagExists(benefitsTags, benefit)) {
        benefitsTags.push(benefit);
        renderTags(
          elements.benefitsTags,
          benefitsTags,
          (tags) => { benefitsTags = tags; syncSuggestedTags('benefits'); updateTagCount('benefits'); },
          'benefits'
        );
        updateTagCount('benefits');
      }
    });
  });
}

// ============================================================================
// FORM SUBMISSION & VALIDATION
// ============================================================================

/**
 * Set up form submission handler
 */
function setupFormSubmission() {
  elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveProfile();
  });
}

/**
 * Validate and save the profile
 */
async function saveProfile() {
  const saveBtn = document.querySelector('.btn-save');

  try {
    // Show loading state
    saveBtn.disabled = true;
    saveBtn.classList.add('loading');
    showStatus('Saving profile...', 'info');

    // Collect form data
    collectFormData();

    // Validate required fields
    const validation = validateProfile();
    if (!validation.valid) {
      showStatus(validation.message, 'error');
      saveBtn.disabled = false;
      saveBtn.classList.remove('loading');
      return;
    }

    // Update timestamp
    profileData.last_updated = new Date().toISOString();

    // Save to Chrome storage
    await chrome.storage.local.set({
      [PROFILE_STORAGE_KEY]: profileData
    });

    console.log('[Profile Setup] Profile saved:', profileData);

    // Show success message
    showStatus('Profile saved successfully! You can now close this page.', 'success');

    // Mark all tabs as completed
    elements.tabs.forEach(tab => tab.classList.add('completed'));

    // If opened in a new tab, offer to close
    setTimeout(() => {
      if (window.opener || document.referrer) {
        showStatus('Profile saved! You can close this tab and return to your job search.', 'success');
      }
    }, 1000);

  } catch (error) {
    console.error('[Profile Setup] Save error:', error);
    showStatus('Failed to save profile. Please try again.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.classList.remove('loading');
  }
}

/**
 * Collect data from form fields into profileData object
 */
function collectFormData() {
  // Tab 1: Preferences
  profileData.preferences.salary_floor = parseInt(elements.salaryFloor.value, 10) || 150000;
  profileData.preferences.salary_target = parseInt(elements.salaryTarget.value, 10) || 200000;
  profileData.preferences.bonus_preference = elements.bonusPreference.value;
  profileData.preferences.equity_preference = elements.equityPreference.value;
  profileData.preferences.employment_type_preferred = elements.employmentType.value;

  // Workplace types (from checkboxes)
  const workplaceCheckboxes = document.querySelectorAll('input[name="workplace_types_acceptable"]:checked');
  profileData.preferences.workplace_types_acceptable = Array.from(workplaceCheckboxes).map(cb => cb.value);

  // Set unacceptable types (opposite of acceptable)
  const allWorkplaceTypes = ['remote', 'hybrid', 'on_site'];
  profileData.preferences.workplace_types_unacceptable = allWorkplaceTypes.filter(
    t => !profileData.preferences.workplace_types_acceptable.includes(t)
  );

  // Benefits preferences (from tag input)
  profileData.preferences.benefits = [...benefitsTags];

  // Tab 2: Background
  profileData.background.current_title = elements.currentTitle.value.trim();
  profileData.background.years_experience = parseInt(elements.yearsExperience.value, 10) || 0;
  profileData.background.core_skills = [...skillTags];
  profileData.background.industries = [...industryTags];
  profileData.background.target_roles = [...roleTags];

  // Tab 3: Deal-breakers & Must-haves
  const dealBreakerCheckboxes = document.querySelectorAll('input[name="deal_breakers"]:checked');
  profileData.preferences.deal_breakers = Array.from(dealBreakerCheckboxes).map(cb => cb.value);

  const mustHaveCheckboxes = document.querySelectorAll('input[name="must_haves"]:checked');
  profileData.preferences.must_haves = Array.from(mustHaveCheckboxes).map(cb => cb.value);
}

/**
 * Validate the profile data
 * @returns {Object} { valid: boolean, message: string }
 */
function validateProfile() {
  // Salary floor must be positive
  if (profileData.preferences.salary_floor <= 0) {
    return { valid: false, message: 'Please enter a valid salary floor' };
  }

  // Target must be >= floor
  if (profileData.preferences.salary_target < profileData.preferences.salary_floor) {
    return { valid: false, message: 'Target salary should be at or above your floor' };
  }

  // At least one workplace type must be acceptable
  if (profileData.preferences.workplace_types_acceptable.length === 0) {
    return { valid: false, message: 'Please select at least one acceptable workplace type' };
  }

  // Warn if no skills (but don't block)
  if (profileData.background.core_skills.length === 0) {
    console.warn('[Profile Setup] No skills defined - scoring will be less accurate');
  }

  return { valid: true, message: '' };
}

// ============================================================================
// LOAD EXISTING PROFILE
// ============================================================================

/**
 * Load existing profile from Chrome storage and populate form
 */
async function loadExistingProfile() {
  try {
    const result = await chrome.storage.local.get([PROFILE_STORAGE_KEY]);
    const savedProfile = result[PROFILE_STORAGE_KEY];

    if (savedProfile) {
      console.log('[Profile Setup] Loading existing profile:', savedProfile);
      profileData = { ...profileData, ...savedProfile };
      populateFormFromProfile();
    }
  } catch (error) {
    console.error('[Profile Setup] Error loading profile:', error);
  }
}

/**
 * Populate form fields from profileData
 */
function populateFormFromProfile() {
  // Tab 1: Preferences
  if (profileData.preferences.salary_floor) {
    elements.salaryFloor.value = profileData.preferences.salary_floor;
  }
  if (profileData.preferences.salary_target) {
    elements.salaryTarget.value = profileData.preferences.salary_target;
  }
  if (profileData.preferences.bonus_preference) {
    elements.bonusPreference.value = profileData.preferences.bonus_preference;
  }
  if (profileData.preferences.equity_preference) {
    elements.equityPreference.value = profileData.preferences.equity_preference;
  }
  // Migrate old combined field to new separate fields
  if (profileData.preferences.bonus_and_equity_preference && !profileData.preferences.bonus_preference) {
    const oldValue = profileData.preferences.bonus_and_equity_preference;
    elements.bonusPreference.value = oldValue;
    elements.equityPreference.value = oldValue === 'required' ? 'preferred' : oldValue;
  }
  if (profileData.preferences.employment_type_preferred) {
    elements.employmentType.value = profileData.preferences.employment_type_preferred;
  }

  // Workplace types checkboxes
  document.querySelectorAll('input[name="workplace_types_acceptable"]').forEach(cb => {
    cb.checked = (profileData.preferences.workplace_types_acceptable || []).includes(cb.value);
  });

  // Benefits preferences tags
  benefitsTags = profileData.preferences.benefits || [];
  renderTags(elements.benefitsTags, benefitsTags, (tags) => { benefitsTags = tags; });

  // Mark suggested benefits as used
  benefitsTags.forEach(benefit => {
    const btn = document.querySelector(`.suggested-tag[data-benefit="${benefit}"]`);
    if (btn) btn.classList.add('used');
  });

  // Tab 2: Background
  if (profileData.background.current_title) {
    elements.currentTitle.value = profileData.background.current_title;
  }
  if (profileData.background.years_experience) {
    elements.yearsExperience.value = profileData.background.years_experience;
  }

  // Load tags
  skillTags = profileData.background.core_skills || [];
  industryTags = profileData.background.industries || [];
  roleTags = profileData.background.target_roles || [];

  // Render tags
  renderTags(elements.skillsTags, skillTags, (tags) => { skillTags = tags; });
  renderTags(elements.industriesTags, industryTags, (tags) => { industryTags = tags; });
  renderTags(elements.rolesTags, roleTags, (tags) => { roleTags = tags; });

  // Mark suggested tags as used
  skillTags.forEach(skill => {
    const btn = document.querySelector(`.suggested-tag[data-skill="${skill}"]`);
    if (btn) btn.classList.add('used');
  });
  industryTags.forEach(industry => {
    const btn = document.querySelector(`.suggested-tag[data-industry="${industry}"]`);
    if (btn) btn.classList.add('used');
  });
  roleTags.forEach(role => {
    const btn = document.querySelector(`.suggested-tag[data-role="${role}"]`);
    if (btn) btn.classList.add('used');
  });

  // Tab 3: Deal-breakers
  document.querySelectorAll('input[name="deal_breakers"]').forEach(cb => {
    cb.checked = (profileData.preferences.deal_breakers || []).includes(cb.value);
  });

  document.querySelectorAll('input[name="must_haves"]').forEach(cb => {
    cb.checked = (profileData.preferences.must_haves || []).includes(cb.value);
  });
}

// ============================================================================
// STATUS MESSAGES
// ============================================================================

/**
 * Display a status message
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', or 'info'
 */
function showStatus(message, type) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
}

/**
 * Hide the status message
 */
function hideStatus() {
  elements.statusMessage.className = 'status-message hidden';
}
