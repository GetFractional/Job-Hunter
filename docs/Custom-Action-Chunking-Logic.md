# Custom Action Chunking Logic Reference

**Version**: 1.0  
**Purpose**: Handle large Research JSON payloads for Airtable API (50K char limit)

---

## CORE vs EXTENDED FIELDS

### Core Fields (POST - Always First)
- job (link to Jobs Pipeline record)
- fit_label, fit_score, fit_summary
- reasons_to_pursue, risks_or_flags
- company_summary, stage, revenue_range, funding, headcount
- products_services, revenue_model, gtm_motion, mission, vision
- icp_summary, reported_cac, estimated_cac_range
- role_summary, role_requirements, team_structure
- market_summary
- hiring_manager_intel_summary
- strategic_positioning_summary, best_angle
- research_sources, quality_score

### Extended Fields (PATCH - If Needed)
- success_metrics, pain_points, inflection_point
- industry_trends, growth_signals, competitive_threats
- hiring_manager_name, hiring_manager_title, hiring_manager_priority, hiring_manager_decision_gate
- stakeholder_1_name, stakeholder_1_title, stakeholder_1_priority, stakeholder_1_decision_gate
- stakeholder_2_name, stakeholder_2_title, stakeholder_2_priority, stakeholder_2_decision_gate
- stakeholder_3_name, stakeholder_3_title, stakeholder_3_priority, stakeholder_3_decision_gate
- hiring_priorities
- proof_points, quick_win_opportunities, risks_to_address, key_insights

---

## WORKFLOW

1. **Estimate payload size**: Count total characters in JSON stringified payload
2. **IF <45,000 chars**: 
   - Call `write_research_brief` (POST) with ALL fields
   - Confirm: "Research brief written ([recordId]). Next: Generate assets?"
3. **IF ≥45,000 chars**:
   - Step A: Call `write_research_brief` (POST) with Core Fields only
   - Step B: Extract recordId from response
   - Step C: Call `update_research_brief` (PATCH /tbldzpMjDDpinj2rl/{recordId}) with Extended Fields
   - Confirm: "Research brief written (2-part: [recordId]). Next: Generate assets?"

---

## FIELD MAPPING

Arrays → bullets: `["Item 1", "Item 2"]` → `"- Item 1\n- Item 2"`  
**Never truncate**—preserve full text from Research JSON.

---

## ERROR HANDLING

- **POST fails**: Check job_id format ("rec" + 17 chars), report error + diagnosis
- **PATCH fails**: Notify user with recordId for manual retry
- **fetch_context returns empty**: Wait 1 second, retry once. If still empty: "Record written but not yet queryable. Verify in Airtable or retry in 10 seconds."

---

## CRITICAL RULES

- NEVER skip Extended Fields—they contain hiring manager intel, insights, and positioning
- NEVER proceed to asset generation until write is complete
- jobMeta.job_id MUST start with "rec" and be valid Jobs Pipeline record ID