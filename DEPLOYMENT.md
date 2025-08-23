# Network Monitor Pro - Deployment Guide

## 🚀 Complete Deployment Instructions

This guide will walk you through deploying your Network Monitor Pro Chrome extension to GitHub and setting up automated deployment.

## 📋 Prerequisites

- Git installed and configured
- GitHub account
- GitHub CLI (gh) installed
- Node.js 14+ (for build scripts)

## 🔧 Local Setup

### 1. Initialize Git Repository
```bash
git init
git add .
git commit -m "Initial commit: Network Monitor Pro v2.3.0"
```

### 2. Configure Git
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

## 🌐 GitHub Repository Setup

### 1. Create Repository
```bash
gh repo create network-monitor-pro --public --description "Advanced Chrome extension for comprehensive network monitoring"
```

### 2. Add Remote and Push
```bash
git remote add origin https://github.com/YourUsername/network-monitor-pro.git
git branch -M main
git push -u origin main
```

## 🚀 Automated Deployment

### 1. GitHub Actions Workflow
The repository includes a `.github/workflows/deploy.yml` file that automatically:
- Builds the extension on every push to main
- Creates a distributable package
- Deploys to GitHub Pages
- Uploads build artifacts

### 2. Enable GitHub Pages
1. Go to your repository Settings
2. Navigate to Pages section
3. Set source to "GitHub Actions"
4. The workflow will automatically deploy to `gh-pages` branch

## 📦 Manual Build and Deploy

### 1. Build Extension
```bash
npm run build
```

This will:
- Create a `dist/` folder with all extension files
- Generate a `network-monitor-pro-v2.3.0.zip` package

### 2. Deploy to GitHub
```bash
npm run deploy
```

This will:
- Build the extension
- Commit changes
- Push to GitHub
- Trigger automated deployment

## 🔄 Continuous Deployment

### 1. Automatic Deployment
- Every push to `main` branch triggers deployment
- GitHub Actions builds and deploys automatically
- Extension package is available as release artifact

### 2. Manual Release
```bash
# Create a new release
gh release create v2.3.1 --title "Version 2.3.1" --notes "Bug fixes and improvements"

# Upload extension package
gh release upload v2.3.1 network-monitor-pro-v2.3.0.zip
```

## 📱 Chrome Web Store Deployment

### 1. Package Extension
```bash
npm run build:extension
cd dist
zip -r ../network-monitor-pro-webstore.zip .
```

### 2. Upload to Chrome Web Store
1. Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Create new item or update existing
3. Upload the zip file
4. Fill in store listing details
5. Submit for review

## 🌍 GitHub Pages Deployment

### 1. Enable Pages
- Repository Settings → Pages
- Source: Deploy from a branch
- Branch: gh-pages
- Folder: / (root)

### 2. Custom Domain (Optional)
- Add custom domain in Pages settings
- Update CNAME file in repository
- Configure DNS records

## 📊 Monitoring Deployment

### 1. GitHub Actions
- Check Actions tab for build status
- View deployment logs
- Monitor build artifacts

### 2. GitHub Pages
- Check Pages tab for deployment status
- View site URL and settings
- Monitor build logs

## 🔧 Troubleshooting

### Common Issues

#### Build Failures
- Check Node.js version (requires 14+)
- Verify all files are present
- Check GitHub Actions logs

#### Deployment Issues
- Verify GitHub Pages is enabled
- Check gh-pages branch exists
- Verify workflow permissions

#### Extension Loading Issues
- Check manifest.json syntax
- Verify all required files are present
- Test in Chrome DevTools

## 📈 Performance Optimization

### 1. Build Optimization
- Minimize CSS and JavaScript
- Optimize images and icons
- Use efficient compression

### 2. Deployment Optimization
- Enable GitHub Actions caching
- Use efficient build steps
- Optimize artifact uploads

## 🔒 Security Considerations

### 1. Repository Security
- Enable branch protection
- Require pull request reviews
- Enable security scanning

### 2. Extension Security
- Validate all inputs
- Use secure communication
- Follow OWASP guidelines

## 📚 Additional Resources

- [Chrome Extension Development Guide](https://developer.chrome.com/docs/extensions/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Pages Guide](https://pages.github.com/)
- [Chrome Web Store Developer Guide](https://developer.chrome.com/docs/webstore/)

## 🎯 Next Steps

1. **Test Deployment**: Verify extension works after deployment
2. **Monitor Performance**: Track build and deployment metrics
3. **Update Documentation**: Keep deployment guide current
4. **Automate Releases**: Set up automated version bumping
5. **Performance Monitoring**: Monitor extension performance metrics

---

**Network Monitor Pro** - Deployed and ready for production! 🚀

For support, visit: [GitHub Issues](https://github.com/YourUsername/network-monitor-pro/issues)
