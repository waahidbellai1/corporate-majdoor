alert("app.js loaded");

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";



import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDv8-8o_pd9ZUxxazTbBH5xBb_olbuhyag",
  authDomain: "corporate-majdoor.firebaseapp.com",
  projectId: "corporate-majdoor",
  storageBucket: "corporate-majdoor.appspot.com", // ✅ FIXED
  messagingSenderId: "490168158830",
  appId: "1:490168158830:web:bde232dae0cff6ab8bb47f"
};


// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Elements
const usernameInput = document.getElementById("username");
const email = document.getElementById("email");
const password = document.getElementById("password");
const status = document.getElementById("status");
const postSection = document.getElementById("postSection");
const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");
const feed = document.getElementById("feed");
const authSection = document.getElementById("authSection");
postBtn.addEventListener("click", async () => {
  console.log("Posting as:", auth.currentUser);

  if (!auth.currentUser) {
    status.innerText = "Please login again";
    return;
  }

  if (!postInput.value.trim()) return;

  try {
    await addDoc(collection(db, "posts"), {
      text: postInput.value,
      uid: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });

    postInput.value = "";
  } catch (err) {
    console.error(err);
    status.innerText = err.message;
  }
});

const q = query(
  collection(db, "posts"),
  orderBy("createdAt", "desc")
);
async function getUsername(uid) {
  if (!uid) return "Unknown";

  const userSnap = await getDoc(doc(db, "users", uid));

  if (userSnap.exists()) {
    return userSnap.data().username;
  }

  return "Unknown";
}
onSnapshot(q, (snapshot) => {
  feed.innerHTML = "";

  snapshot.forEach(postDoc => {
    const data = postDoc.data(); // ✅ ONLY ONCE

    const postDiv = document.createElement("div");
    postDiv.className = "post";

    let deleteBtnHTML = "";
    if (auth.currentUser && auth.currentUser.uid === data.uid) {
      deleteBtnHTML = `<button class="deleteBtn">Delete</button>`;
    }

    postDiv.innerHTML = `
      <div class="post-email">Loading...</div>
      <div class="post-text">${data.text}</div>
      ${deleteBtnHTML}
    `;

    // Username lookup
    if (data.uid) {
      getUsername(data.uid).then(username => {
        const nameDiv = postDiv.querySelector(".post-email");
        if (nameDiv) nameDiv.innerText = `@${username}`;
      });
    } else {
      const nameDiv = postDiv.querySelector(".post-email");
      if (nameDiv) nameDiv.innerText = "Unknown";
    }

    // Delete logic
    const deleteBtn = postDiv.querySelector(".deleteBtn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "posts", postDoc.id));
      });
    }

    feed.appendChild(postDiv);
  });
});


// Login
document.getElementById("loginBtn").addEventListener("click", () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .then(() => {
      status.innerText = "✅ Logged in successfully";
    })
    .catch(err => {
      status.innerText = err.message;
    });
});

// Signup
document.getElementById("signupBtn").addEventListener("click", async () => {
  if (!usernameInput.value.trim()) {
    status.innerText = "Username required";
    return;
  }

  try {
    const userCred = await createUserWithEmailAndPassword(
      auth,
      email.value.trim(),
      password.value
    );

    const user = userCred.user;

    // Save username in Firestore
    await setDoc(doc(db, "users", user.uid), {
      username: usernameInput.value.trim(),
      email: user.email
    });

    status.innerText = "🎉 Account created";

  } catch (err) {
    status.innerText = err.message;
  }
});
const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", () => {
  signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    // Logged in → FEED
    authSection.style.display = "none";
    postSection.style.display = "block";
    logoutBtn.style.display = "block";

    status.innerText = `👋 ${user.email}`;
  } else {
    // Logged out → LOGIN
    authSection.style.display = "block";
    postSection.style.display = "none";
    logoutBtn.style.display = "none";

    status.innerText = "🔐 Login to Corporate Majdoor";
  }
});




