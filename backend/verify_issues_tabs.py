
print("Verifying Issues Tab Logic...")

# Static analysis
issues_content = open('backend/endpoints/issues.py').read()
frontend_content = open('frontend/src/pages/LaboratoryIssuesPage.jsx').read()

# Backend Checks
assert "tab = request.args.get('tab')" in issues_content, "Backend missing 'tab' retrieval"
assert "if tab == 'flags':" in issues_content, "Backend missing 'flags' tab logic"
assert "DATE_SUB(NOW(), INTERVAL 1 WEEK)" in issues_content, "Backend missing 1 week date math"
assert "DATE_SUB(NOW(), INTERVAL 2 WEEK)" in issues_content, "Backend missing 2 week date math"

# Frontend Checks
assert "activeKey={activeTab}" in frontend_content, "Frontend missing Tabs activeKey"
assert "showAllFlags" in frontend_content, "Frontend missing showAllFlags"
assert "tab=${activeTab}" in frontend_content, "Frontend missing tab query param"

print("[SUCCESS] All static checks passed for Issues Tabs.")
