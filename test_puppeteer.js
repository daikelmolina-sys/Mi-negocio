const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    
    await page.goto('http://localhost:8085');
    
    // Login
    await page.waitForSelector('#login-username', {visible: true});
    await page.type('#login-username', 'admin');
    await page.type('#login-password', 'admin123');
    await page.click('#form-login button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForSelector('#nav-usuarios', {visible: true});
    
    // Go to usuarios
    await page.click('#nav-usuarios');
    await page.waitForSelector('button[onclick="window.openUsuarioModal()"]', {visible: true});
    
    // Open modal
    await page.click('button[onclick="window.openUsuarioModal()"]');
    await page.waitForSelector('#user-username', {visible: true});
    
    // Type info
    await page.type('#user-username', 'admin2');
    await page.type('#user-password', 'admin123');
    
    // Submit
    console.log('Submitting form...');
    await page.click('#form-usuario button[type="submit"]');
    
    // Wait a bit to see what happens
    await new Promise(r => setTimeout(r, 2000));
    console.log('Done waiting.');
    
    await browser.close();
})();
