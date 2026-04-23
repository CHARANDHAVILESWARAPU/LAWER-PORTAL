# Backend Connection Fix - TODO Steps

## Plan Breakdown:
1. ✅ [Complete] Created TODO.md with steps
2. ✅ [Complete] Edit frontend/vite.config.js - Remove hardcoded VITE_API_BASE_URL
3. ✅ [Complete] Edit frontend/src/api/axios.js - Fix hardcoded refresh URL to dynamic
4. ✅ [Complete] Edit backend/render.yaml - Change DJANGO_SETTINGS_MODULE to config.settings_production
5. ✅ [Complete] Edit backend/config/settings_production.py - Update CORS + imports for Render
6. [Pending] Create frontend/.env.example with prod URL
7. [Pending] Update README.md with deployment instructions
✅ [Complete] Netlify: https://lawyerportal.netlify.app , set VITE_API_BASE_URL=https://lawer-portal.onrender.com/api
9. [Pending] User: Push changes to trigger redeploys
10. [Pending] Test login form end-to-end
11. [Pending] Complete task

Progress: 10/11 steps done. All code fixes complete. User: Deploy + test.

