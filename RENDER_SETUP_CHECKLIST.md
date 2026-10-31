# 📋 Render Deployment Checklist

Quick checklist for deploying MESOB HRMS to Render. For detailed instructions, see `DEPLOYMENT_GUIDE.md`.

---

## ✅ **Before You Start**

- [ ] Code is working locally (backend and frontend)
- [ ] All changes committed to Git
- [ ] Pushed to GitHub repository
- [ ] Render account created
- [ ] GitHub connected to Render

---

## 🚀 **Deployment Steps**

### **1. Run Pre-Deployment Check**

```bash
node check-deployment-readiness.js
```

Fix any errors before continuing.

### **2. Push to GitHub**

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### **3. Deploy on Render**

1. Go to [render.com](https://render.com/dashboard)
2. Click **"New +"** → **"Blueprint"**
3. Select your GitHub repository
4. Render will detect `render.yaml`
5. Click **"Apply"**
6. Wait for services to be created (~5-10 minutes)

### **4. Set Up MinIO (Choose One)**

**Option A: MinIO Cloud** (Recommended)
- [ ] Sign up at [min.io](https://min.io)
- [ ] Create bucket: `mesob-hrms`
- [ ] Get access key and secret key
- [ ] Add to backend environment variables

**Option B: Disable MinIO Temporarily** (Testing Only)
- [ ] Set `MINIO_ENDPOINT=localhost` in backend
- [ ] File uploads will fail but app will work

### **5. Configure Environment Variables**

**Backend Service:**
- [ ] `FRONTEND_URL` = your frontend URL (e.g., `https://mesob-hrms.onrender.com`)
- [ ] `CORS_ORIGIN` = same as FRONTEND_URL
- [ ] `MINIO_ENDPOINT` = your MinIO URL or S3 endpoint
- [ ] `MINIO_ACCESS_KEY` = your MinIO/S3 access key
- [ ] `MINIO_SECRET_KEY` = your MinIO/S3 secret key
- [ ] Other variables auto-filled by Render ✅

**Frontend Service:**
- [ ] `VITE_API_URL` = your backend URL (e.g., `https://mesob-hrms-backend.onrender.com`)

### **6. Initialize Database**

1. Go to backend service → **Shell** tab
2. Run:
```bash
cd backend
npm run db:init
```

### **7. Verify Deployment**

**Backend Health Check:**
- [ ] Visit: `https://[your-backend].onrender.com/api/health`
- [ ] Should show `{"status":"healthy"}`

**Frontend:**
- [ ] Visit: `https://[your-frontend].onrender.com`
- [ ] Should load login page

**Test Login:**
- [ ] Username: `abebe.tadesse`
- [ ] Password: `mesob2024`
- [ ] Should login successfully

---

## 🔧 **Post-Deployment**

- [ ] Change default admin password
- [ ] Update all user passwords from `mesob2024`
- [ ] Test all major features:
  - [ ] Employee management
  - [ ] Leave requests
  - [ ] Letter generation
  - [ ] Attendance tracking
  - [ ] Dashboard loading
- [ ] Set up monitoring/alerts
- [ ] Document your deployment URLs
- [ ] Share with team

---

## 📝 **Your Deployment URLs**

Fill these in after deployment:

**Backend API:**
```
https://mesob-hrms-backend.onrender.com
```

**Frontend:**
```
https://mesob-hrms.onrender.com
```

**Database:**
```
Internal Render database (not publicly accessible)
```

**MinIO/S3:**
```
[Your MinIO URL or S3 bucket]
```

---

## 🆘 **Troubleshooting**

**Problem: Backend won't start**
→ Check logs: Backend service → **Logs** tab
→ Verify database connection
→ Check environment variables

**Problem: Frontend shows "Network Error"**
→ Check `VITE_API_URL` in frontend environment
→ Verify backend is running
→ Check CORS configuration

**Problem: "Cannot connect to database"**
→ Verify database service is running
→ Check database credentials in backend environment
→ Wait for database to fully initialize (can take 2-3 minutes)

**Problem: Service keeps spinning down**
→ This is normal on free tier (spins down after 15 min inactivity)
→ First request after spin-down takes ~30-60 seconds
→ Upgrade to paid plan for always-on service

---

## 💡 **Tips**

- **Free tier limitations**: Services spin down after 15 min inactivity
- **First deploy takes time**: ~10-15 minutes for all services
- **Database limits**: 256MB on free tier - upgrade for production
- **Always check logs**: Logs tab shows detailed error messages
- **Test incrementally**: Verify each service before testing together
- **MinIO alternative**: Can use AWS S3 instead of MinIO

---

## 📞 **Need Help?**

- Read full guide: `DEPLOYMENT_GUIDE.md`
- Check Render docs: [render.com/docs](https://render.com/docs)
- Render community: [community.render.com](https://community.render.com)

---

**Deployment Date:** _______________

**Deployed By:** _______________

**Notes:**
```
[Add any deployment-specific notes here]
```
