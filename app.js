// Firebase Configuration Setup
const firebaseConfig = {
  apiKey: "AIzaSyBhqMGeizGgz16jDn2_CS4cRfToFjLb8kM",
  authDomain: "quick-cash-pk.firebaseapp.com",
  projectId: "quick-cash-pk",
  storageBucket: "quick-cash-pk.firebasestorage.app",
  messagingSenderId: "506832360758",
  appId: "1:506832360758:web:2fa52e7df9a1f99793cf97"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentUser = null;

// Tab Switcher (Login/Register)
function switchTab(tab) {
    if (tab === 'login') {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('loginTabBtn').classList.add('active');
        document.getElementById('registerTabBtn').classList.remove('active');
    } else {
        document.getElementById('registerForm').classList.remove('hidden');
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerTabBtn').classList.add('active');
        document.getElementById('loginTabBtn').classList.remove('active');
    }
}

// User Registration
async function registerUser() {
    const user = document.getElementById('regUser').value.trim().toLowerCase();
    const pass = document.getElementById('regPass').value.trim();
    const refBy = document.getElementById('regRef').value.trim().toLowerCase();

    if (!user || !pass) {
        alert("Meharbani karke Username aur Password daalein!");
        return;
    }

    const userDoc = await db.collection("users").doc(user).get();
    if (userDoc.exists) {
        alert("Yeh Username pehle se maujood hai! Koi doosra try karein.");
        return;
    }

    let myRefCode = user + Math.floor(1000 + Math.random() * 9000);

    // Give Referral bonus to referrer if valid code exists
    if (refBy) {
        const refQuery = await db.collection("users").where("referralCode", "==", refBy).get();
        if (!refQuery.empty) {
            const referrerDoc = refQuery.docs[0];
            const newBal = (referrerDoc.data().balance || 0) + 100;
            const newCount = (referrerDoc.data().totalReferrals || 0) + 1;
            await db.collection("users").doc(referrerDoc.id).update({
                balance: newBal,
                totalReferrals: newCount
            });
        }
    }

    // Create New User Document
    const userData = {
        username: user,
        password: pass,
        balance: 380, // 380 App PKR Signup Bonus
        totalReferrals: 0,
        referralCode: myRefCode,
        referredBy: refBy || "None",
        adsWatched: 0
    };

    await db.collection("users").doc(user).set(userData);
    alert("Mubarak ho! 380 App PKR Bonus ke sath account ban gaya hai.");
    loginSuccess(userData);
}

// User Login
async function loginUser() {
    const user = document.getElementById('loginUser').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value.trim();

    if (!user || !pass) {
        alert("Username aur Password dono likhen!");
        return;
    }

    const userDoc = await db.collection("users").doc(user).get();
    if (!userDoc.exists || userDoc.data().password !== pass) {
        alert("Ghalat Username ya Password!");
        return;
    }

    loginSuccess(userDoc.data());
}

// Dashboard Update After Login
function loginSuccess(userData) {
    currentUser = userData;
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    document.getElementById('subHeader').innerText = "Welcome back, " + currentUser.username + "!";

    updateUI();
}

function updateUI() {
    const realCash = (currentUser.balance * 0.05).toFixed(1); // 1000 App PKR = 50 Cash (1 App PKR = 0.05 PKR)
    document.getElementById('userBalance').innerText = currentUser.balance + " App PKR";
    document.getElementById('cashValue').innerText = "= " + realCash + " PKR Real Cash";
    document.getElementById('totalRef').innerText = currentUser.totalReferrals;
    document.getElementById('myRefCode').value = currentUser.referralCode;
    document.getElementById('adProgress').innerText = currentUser.adsWatched + " / 10";
    document.getElementById('adCountText').innerText = currentUser.adsWatched + " / 10 Completed";
}

// Navigation between Menu Options
function showPage(page) {
    document.getElementById('pageHome').classList.add('hidden');
    document.getElementById('pageAds').classList.add('hidden');
    document.getElementById('pageReferral').classList.add('hidden');
    document.getElementById('pageWithdraw').classList.add('hidden');

    if (page === 'home') document.getElementById('pageHome').classList.remove('hidden');
    if (page === 'ads') document.getElementById('pageAds').classList.remove('hidden');
    if (page === 'referral') document.getElementById('pageReferral').classList.remove('hidden');
    if (page === 'withdraw') document.getElementById('pageWithdraw').classList.remove('hidden');
}

// Watch Ads Logic
async function watchAd() {
    if (currentUser.adsWatched >= 10) {
        alert("Aap ne aaj ke 10 Ads poore dekh liye hain!");
        return;
    }

    // Simulating Ad Watch
    alert("Ad chal raha hai... 3 seconds wait karein.");
    setTimeout(async () => {
        currentUser.adsWatched += 1;
        currentUser.balance += 10; // 10 App PKR bonus per ad
        
        await db.collection("users").doc(currentUser.username).update({
            adsWatched: currentUser.adsWatched,
            balance: currentUser.balance
        });

        updateUI();
        alert("Ad mukammal hua! +10 App PKR add ho gaye.");
    }, 1000);
}

// Copy Referral Code
function copyRefCode() {
    const codeInput = document.getElementById('myRefCode');
    codeInput.select();
    document.execCommand('copy');
    alert("Referral Code Copy ho gaya hai: " + codeInput.value);
}

// Request Withdrawal
async function requestWithdraw() {
    const method = document.getElementById('methodSelect').value;
    const name = document.getElementById('accName').value.trim();
    const number = document.getElementById('accNumber').value.trim();
    const amount = parseInt(document.getElementById('withdrawAmount').value);

    if (currentUser.adsWatched < 10) {
        alert("Pehle daily 10 Ads dekhein, uske baad hi withdraw kar wa sakte hain!");
        return;
    }

    if (!name || !number || !amount) {
        alert("Tamam detail sahi se bharen!");
        return;
    }

    if (amount < 1000) {
        alert("Minimum withdrawal limit 1,000 App PKR (= 50 PKR Real Cash) hai.");
        return;
    }

    if (amount > currentUser.balance) {
        alert("Aap ke pas itna balance nahi hai!");
        return;
    }

    // Deduct balance and record withdrawal
    currentUser.balance -= amount;
    const realCashAmount = (amount * 0.05).toFixed(0);

    await db.collection("users").doc(currentUser.username).update({
        balance: currentUser.balance
    });

    await db.collection("withdrawals").add({
        username: currentUser.username,
        method: method,
        accountName: name,
        accountNumber: number,
        appPoints: amount,
        pkrAmount: realCashAmount,
        status: "Pending",
        date: new Date().toLocaleString()
    });

    updateUI();
    alert("Withdrawal request bhej di gayi hai! " + realCashAmount + " PKR aap ke " + method + " account mein bhej diye jayenge.");
}

// Logout
function logout() {
    location.reload();
}
