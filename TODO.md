# Deployment Plan - Easy Steps Like You're 10! 🚀

## Step 1: Make GitHub Home for Your Project (5 mins)
1. Go to github.com, login (or make free account)
2. Click green 'New' button → Name: 'Project_lawyer'
3. Make Public, Add README, click 'Create repository'
4. Copy the HTTPS link (like https://github.com/yourname/Project_lawyer.git)

## Step 2: Save Your Code to GitHub (Here in VSCode)
Run these one by one:
```
git init
git add .
git commit -m "First save: Lawyer project ready!"
git branch -M main
git remote add origin YOUR_GITHUB_LINK_HERE
git push -u origin main
```

## Step 3: Deploy Frontend to Netlify (2 mins)
1. Go netlify.com, login with GitHub
2. 'New site from Git' → GitHub → Project_lawyer → Deploy
3. Build: `npm run build`, Publish: `dist`, Auto-deploy ✅
4. Your site live! (like https://awesome-lawyer.netlify.app)

## Step 4: Deploy Backend to Render (3 mins)
1. render.com, login with GitHub
2. 'New+' → Web Service → GitHub → Project_lawyer
3. Settings: Build `pip install -r backend/requirements.txt`, Start `gunicorn config.wsgi`
4. Environment: Add SECRET_KEY, OPENAI_API_KEY, etc.
5. Live API! Update frontend axios.js with new API URL.

**Ready? Paste your GitHub repo link after Step 2! I'll help next steps.**

**✅ Step 2 Progress: `git add .` SUCCESS!** (LF/CRLF warnings = normal on Windows, ignore ✅)

**Next 4 commands (copy one-by-one):**
```
git commit -m "Ready lawyer app with AI!"
git branch -M main
```
```
REM Create GitHub repo first, then:
git remote add origin https://github.com/YOURNAME/Project_lawyer.git
git push -u origin main
```

**Reply with GitHub repo URL when pushed!** → Netlify + Render next.

**Status: Git setup → Almost done!**
