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

// Master Referral Code for the very first user
const MASTER_REF_CODE = "ADMIN123";

let currentUser = null;

// Helper: Get Today's Date String (YYYY-MM-DD)
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

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
    try {
        const user = document.getElementById('regUser').value.trim().toLowerCase();
        const pass = document.getElementById('regPass').value.trim();
        const refBy = document.getElementById('regRef').value.trim().toUpperCase();

        if (!user || !pass) {
            alert("Meharbani karke Username aur Password dono daalein!");
            return;
        }

        if (!refBy) {
            alert("Referral Code daalna LAZMI hai! Pehla banda ADMIN123 use karein.");
            return;
        }

        const userDoc = await db.collection("users").doc(user).get();
        if (userDoc.exists) {
            alert("Yeh Username pehle se maujood hai! Koi doosra try karein.");
            return;
        }

        let isRefValid = false;

        if (refBy === MASTER_REF_CODE) {
            isRefValid = true;
        } else {
            const refQuery = await db.collection("users").where("referralCode", "==", refBy).get();
            if (!refQuery.empty) {
                isRefValid = true;
                const referrerDoc = refQuery.docs[0];
                const newBal = (referrerDoc.data().balance || 0) + 100;
                const newCount = (referrerDoc.data().totalReferrals || 0) + 1;
                await db.collection("users").doc(referrerDoc.id).update({
                    balance: newBal,
                    totalReferrals: newCount
                });
            }
        }

        if (!isRefValid) {
            alert("Ghalat Referral Code! Register hone ke liye sahi Referral Code hona zaroori hai.");
            return;
        }

        let myRefCode = user.toUpperCase() + Math.floor(100 + Math.random() * 900);

        const userData = {
            username: user,
            password: pass,
            balance: 380,
            totalReferrals: 0,
            referralCode: myRefCode,
            referredBy: refBy,
            adsWatched: 0,
            lastWatchDate: getTodayDateString() // 🟢 Date track karne ke liye
        };

        await db.collection("users").doc(user).set(userData);
        alert("Mubarak ho! 380 App PKR Bonus ke sath account ban gaya hai.\nAap ka Referral Code: " + myRefCode);
        loginSuccess(userData);

    } catch (error) {
        alert("Registration Error: " + error.message);
        console.error(error);
    }
}

// User Login
async function loginUser() {
    try {
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
    } catch (error) {
        alert("Login Error: " + error.message);
        console.error(error);
    }
}

// Dashboard Update After Login
function loginSuccess(userData) {
    currentUser = userData;
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    document.getElementById('subHeader').innerText = "Welcome, " + currentUser.username + "!";

    // 🟢 Realtime User Data Listener + Daily Reset Logic
    db.collection("users").doc(currentUser.username).onSnapshot(async (doc) => {
        if (doc.exists) {
            let data = doc.data();
            const today = getTodayDateString();

            // Check Agar Date Tabdeel Hui Hai Tou Ads Reset Karein (0/10)
            if (data.lastWatchDate !== today) {
                await db.collection("users").doc(currentUser.username).update({
                    adsWatched: 0,
                    lastWatchDate: today
                });
                data.adsWatched = 0;
                data.lastWatchDate = today;
            }

            currentUser = data;
            updateUI();
        }
    });

    loadWithdrawHistory();
}

function updateUI() {
    const realCash = (currentUser.balance * 0.05).toFixed(1);
    document.getElementById('userBalance').innerText = currentUser.balance + " App PKR";
    document.getElementById('cashValue').innerText = "= " + realCash + " PKR Real Cash";
    document.getElementById('totalRef').innerText = currentUser.totalReferrals;
    document.getElementById('myRefCode').value = currentUser.referralCode;
    document.getElementById('adProgress').innerText = currentUser.adsWatched + " / 10";
    document.getElementById('adCountText').innerText = currentUser.adsWatched + " / 10 Completed";
}

// Navigation Pages
function showPage(page) {
    document.getElementById('pageHome').classList.add('hidden');
    document.getElementById('pageAds').classList.add('hidden');
    document.getElementById('pageReferral').classList.add('hidden');
    document.getElementById('pageWithdraw').classList.add('hidden');

    if (page === 'home') document.getElementById('pageHome').classList.remove('hidden');
    if (page === 'ads') document.getElementById('pageAds').classList.remove('hidden');
    if (page === 'referral') document.getElementById('pageReferral').classList.remove('hidden');
    if (page === 'withdraw') {
        document.getElementById('pageWithdraw').classList.remove('hidden');
        loadWithdrawHistory();
    }
}

// Load Withdrawal Records & Show Clear Status Badges + Popup
function loadWithdrawHistory() {
    if (!currentUser) return;

    db.collection("withdrawals")
      .where("username", "==", currentUser.username)
      .onSnapshot((snapshot) => {
          const historyDiv = document.getElementById('withdrawHistoryList');
          if (!historyDiv) return;

          if (snapshot.empty) {
              historyDiv.innerHTML = "<p style='color:#888; font-size:13px; text-align:center;'>Abhi tak koi withdrawal record nahi hai.</p>";
              return;
          }

          let html = "";
          snapshot.docs.forEach(doc => {
              const data = doc.data();
              
              let statusBadge = `<span style="background:#ff9800; color:#000; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:11px;">⏳ Pending</span>`;
              
              if (data.status === "Completed") {
                  statusBadge = `<span style="background:#4caf50; color:#fff; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:11px;">✅ Paid / Completed</span>`;
              } else if (data.status === "Rejected") {
                  statusBadge = `<span style="background:#f44336; color:#fff; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:11px;">❌ Rejected</span>`;
              }

              // Direct Popup Alert when Withdraw is Approved by Admin
              if (data.status === "Completed" && !data.userNotified) {
                  alert("🎉 CONGRATULATIONS!\n\nWithdrawal Received!\nAap ka " + data.pkrAmount + " PKR (" + data.method + ") ka withdrawal successful PAID ho gaya hai!");
                  
                  // Mark notified so popup doesn't repeat
                  db.collection("withdrawals").doc(doc.id).update({ userNotified: true });
              }

              html += `
                  <div style="background:#2a2a2a; border:1px solid #444; padding:12px; border-radius:8px; margin-bottom:10px;">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                          <strong style="color:#fff; font-size:15px;">${data.pkrAmount} PKR (${data.method})</strong>
                          ${statusBadge}
                      </div>
                      <p style="color:#ccc; font-size:12px; margin:2px 0;">Account: ${data.accountNumber} (${data.accountName})</p>
                      <small style="color:#888; font-size:10px;">Date: ${data.date || 'N/A'}</small>
                  </div>
              `;
          });

          historyDiv.innerHTML = html;
      });
}

// Watch Ads Logic
async function watchAd() {
    const today = getTodayDateString();

    // 🟢 Double Check Date Before Watching
    if (currentUser.lastWatchDate !== today) {
        currentUser.adsWatched = 0;
        currentUser.lastWatchDate = today;
    }

    if (currentUser.adsWatched >= 10) {
        alert("Aap ne aaj ke 10 Ads poore dekh liye hain! Kal dobara 10 naye ads mileinge.");
        return;
    }

    alert("Ad chal raha hai... Please wait.");
    setTimeout(async () => {
        currentUser.adsWatched += 1;
        currentUser.balance += 10;
        currentUser.lastWatchDate = today;
        
        await db.collection("users").doc(currentUser.username).update({
            adsWatched: currentUser.adsWatched,
            balance: currentUser.balance,
            lastWatchDate: currentUser.lastWatchDate
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
        userNotified: false,
        date: new Date().toLocaleString()
    });

    updateUI();
    loadWithdrawHistory();
    alert("Withdrawal request bhej di gayi hai! " + realCashAmount + " PKR aap ke " + method + " account mein bhej diye jayenge.");
}

function logout() {
    location.reload();
}
