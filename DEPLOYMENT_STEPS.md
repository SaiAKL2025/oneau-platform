# 🚀 OneAU Platform Deployment Steps
## Frontend (Vercel) + Backend (Railway)

---

## 🎯 **STEP 1: DEPLOY BACKEND TO RAILWAY**

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Connect your GitHub account

### 1.2 Deploy Backend
1. **Click "New Project"**
2. **Select "Deploy from GitHub repo"**
3. **Choose your repository**
4. **Select the `backend` folder** (or deploy from root and set root directory)
5. **Railway will automatically detect Node.js and build**

### 1.3 Configure Environment Variables in Railway
Go to your Railway project → Variables tab and add:

```bash
# Database
MONGODB_URI=your-mongodb-connection-string

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Server
NODE_ENV=production
PORT=5000
API_URL=https://your-railway-backend-url.railway.app
FRONTEND_URL=https://your-vercel-frontend-url.vercel.app
BACKEND_URL=https://your-railway-backend-url.railway.app

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=your-email@domain.com
SENDGRID_FROM_NAME=OneAU Platform

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 1.4 Get Railway Backend URL
- Railway will provide a URL like: `https://your-app-name.railway.app`
- **Save this URL** - you'll need it for frontend deployment

---

## 🎯 **STEP 2: DEPLOY FRONTEND TO VERCEL**

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Connect your GitHub account

### 2.2 Deploy Frontend
1. **Click "New Project"**
2. **Import your GitHub repository**
3. **Set Root Directory to `project`**
4. **Vercel will auto-detect Vite and configure build settings**

### 2.3 Configure Environment Variables in Vercel
Go to your Vercel project → Settings → Environment Variables and add:

```bash
# API Configuration
VITE_API_URL=https://your-railway-backend-url.railway.app/api

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_VAPID_KEY=your-vapid-key
```

### 2.4 Deploy
1. **Click "Deploy"**
2. **Wait for build to complete**
3. **Get your Vercel URL** (like: `https://your-app-name.vercel.app`)

---

## 🎯 **STEP 3: UPDATE CORS SETTINGS**

### 3.1 Update Backend CORS
After getting your Vercel URL, update the Railway environment variable:

```bash
FRONTEND_URL=https://your-vercel-frontend-url.vercel.app
```

### 3.2 Redeploy Backend
Railway will automatically redeploy when you update environment variables.

---

## 🎯 **STEP 4: TEST DEPLOYMENT**

### 4.1 Test Backend
```bash
# Test health endpoint
curl https://your-railway-backend-url.railway.app/health

# Should return:
# {"status":"OK","message":"OneAU Backend API is running","timestamp":"..."}
```

### 4.2 Test Frontend
1. Visit your Vercel URL
2. Check if the app loads
3. Test login/registration
4. Verify API calls work

### 4.3 Test Full Integration
1. **Register a new user**
2. **Login with credentials**
3. **Test file uploads**
4. **Test email functionality**
5. **Test Firebase notifications**

---

## 🎯 **STEP 5: FINAL CONFIGURATION**

### 5.1 Update Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Update OAuth redirect URIs:
   - `https://your-vercel-frontend-url.vercel.app/auth/callback`
   - `https://your-railway-backend-url.railway.app/api/auth/google/callback`

### 5.2 Update Firebase Settings
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Add your Vercel domain to authorized domains
3. Update CORS settings if needed

### 5.3 Update Cloudinary Settings
1. Go to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Update CORS settings for your domains

---

## 🎯 **STEP 6: MONITORING & MAINTENANCE**

### 6.1 Railway Monitoring
- Check Railway dashboard for logs
- Monitor resource usage
- Set up alerts for downtime

### 6.2 Vercel Monitoring
- Check Vercel dashboard for build status
- Monitor performance metrics
- Set up error tracking

### 6.3 Database Monitoring
- Monitor MongoDB Atlas
- Set up database backups
- Monitor connection limits

---

## 🚨 **TROUBLESHOOTING**

### Common Issues:

1. **CORS Errors**
   - Check FRONTEND_URL in Railway
   - Verify CORS settings in backend

2. **Environment Variables Not Working**
   - Restart Railway deployment
   - Check variable names (case-sensitive)

3. **Build Failures**
   - Check Railway logs
   - Verify package.json scripts

4. **Database Connection Issues**
   - Check MongoDB Atlas IP whitelist
   - Verify connection string

5. **File Upload Issues**
   - Check Cloudinary credentials
   - Verify file size limits

---

## 📊 **DEPLOYMENT CHECKLIST**

- [ ] Railway backend deployed
- [ ] Vercel frontend deployed
- [ ] Environment variables configured
- [ ] CORS settings updated
- [ ] Google OAuth updated
- [ ] Firebase settings updated
- [ ] Cloudinary settings updated
- [ ] Health endpoints working
- [ ] Authentication working
- [ ] File uploads working
- [ ] Email functionality working
- [ ] Notifications working

---

## 🎉 **SUCCESS!**

Your OneAU platform is now live at:
- **Frontend**: `https://your-vercel-url.vercel.app`
- **Backend**: `https://your-railway-url.railway.app`

**Next Steps:**
1. Set up custom domains (optional)
2. Configure SSL certificates
3. Set up monitoring and alerts
4. Plan for scaling
