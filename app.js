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
  doc
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
const email = document.getElementById("email");
const password = document.getElementById("password");
const status = document.getElementById("status");
const postSection = document.getElementById("postSection");
const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");
const feed = document.getElementById("feed");
const authSection = document.getElementById("authSection");
postBtn.addEventListener("click", async () => {
  if (!postInput.value.trim()) return;

  await addDoc(collection(db, "posts"), {
    text: postInput.value,
    email: auth.currentUser.email,
    createdAt: serverTimestamp()
  });

  postInput.value = "";
});
const q = query(
  collection(db, "posts"),
  orderBy("createdAt", "desc")
);

onSnapshot(q, (snapshot) => {
  feed.innerHTML = "";

  snapshot.forEach(postDoc => {
    const data = postDoc.data();

    const postDiv = document.createElement("div");
    postDiv.className = "post";

    let deleteBtnHTML = "";

    if (auth.currentUser && auth.currentUser.email === data.email) {
      deleteBtnHTML = `<button class="deleteBtn">Delete</button>`;
    }

    postDiv.innerHTML = `
      <div class="post-email">${data.email}</div>
      <div class="post-text">${data.text}</div>
      ${deleteBtnHTML}
    `;

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
document.getElementById("signupBtn").addEventListener("click", () => {
  console.log("EMAIL:", email.value);
  console.log("PASSWORD:", password.value);

  createUserWithEmailAndPassword(
    auth,
    email.value.trim(),
    password.value
  )
    .then(() => {
      status.innerText = "🎉 Account created";
    })
    .catch(err => {
      console.error(err);
      status.innerText = err.message;
    });
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

