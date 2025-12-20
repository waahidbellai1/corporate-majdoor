
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
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function timeAgo(timestamp) {
  if (!timestamp) return "";

  const now = Date.now();
  const seconds = Math.floor((now - timestamp.toMillis()) / 1000);

  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";

  return `${days}d ago`;
}


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
  createdAt: serverTimestamp(),
  likedBy: []
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
feed.innerHTML = `
  <div class="skeleton-post">
    <div class="skeleton-header">
      <div class="skeleton skeleton-avatar"></div>
      <div style="flex:1">
        <div class="skeleton skeleton-line medium"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
    </div>
    <div class="skeleton skeleton-line full"></div>
    <div class="skeleton skeleton-line medium"></div>
  </div>
`;
onSnapshot(q, (snapshot) => {
  feed.innerHTML = "";

  snapshot.forEach(postDoc => {
    const data = postDoc.data();

    const postDiv = document.createElement("div");
    postDiv.className = "post";

    let deleteBtnHTML = "";
    if (auth.currentUser && auth.currentUser.uid === data.uid) {
      deleteBtnHTML = `<button class="deleteBtn">Delete</button>`;
    }

    postDiv.innerHTML = `
      <div class="post-header">
  <div class="avatar">?</div>
  <div>
    <div class="post-username">Loading...</div>
    <div class="post-time">${timeAgo(data.createdAt)}</div>
  </div>
</div>

      <div class="post-text">${data.text}</div>

     <div class="post-actions">
  <button class="likeBtn">👍 Like</button>
  <span class="likeCount">${(data.likedBy || []).length}</span>
</div>

      ${deleteBtnHTML}
    `;

    // Username + avatar
    if (data.uid) {
      getUsername(data.uid).then(username => {
        const nameDiv = postDiv.querySelector(".post-username");
        const avatar = postDiv.querySelector(".avatar");

        if (nameDiv) nameDiv.innerText = `@${username}`;
        if (avatar && username) avatar.innerText = username.charAt(0);
      });
    }

    // Delete post
    const deleteBtn = postDiv.querySelector(".deleteBtn");
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        await deleteDoc(doc(db, "posts", postDoc.id));
      };
    }

    // Like button
    const likeBtn = postDiv.querySelector(".likeBtn");

    if (likeBtn && auth.currentUser) {
      const userId = auth.currentUser.uid;
      const postRef = doc(db, "posts", postDoc.id);

      const likedBy = data.likedBy || [];
      const alreadyLiked = likedBy.includes(userId);

      likeBtn.innerText = alreadyLiked ? "❤️ Unlike" : "👍 Like";
      likeBtn.classList.toggle("liked", alreadyLiked);

      likeBtn.onclick = async () => {
        likeBtn.classList.add("pop");
        setTimeout(() => likeBtn.classList.remove("pop"), 300);

        const freshSnap = await getDoc(postRef);
        const freshData = freshSnap.data();
        const freshLikedBy = freshData.likedBy || [];
        const hasLikedNow = freshLikedBy.includes(userId);

        if (hasLikedNow) {
        await updateDoc(postRef, {
  likedBy: arrayRemove(userId)
});

        } else {
          await updateDoc(postRef, {
  likedBy: arrayUnion(userId)
});

        }
      };
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

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // 🔥 AUTO-CREATE USER PROFILE IF MISSING
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        username: user.email.split("@")[0], // fallback username
        email: user.email
      });
    }

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
// =====================
// DARK MODE LOGIC
// =====================
const toggleBtn = document.getElementById("themeToggle");

// Load saved theme or system preference
const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
  document.body.classList.add("dark");
  toggleBtn.innerText = "☀️";
}

// Toggle manually
toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");

  localStorage.setItem("theme", isDark ? "dark" : "light");
  toggleBtn.innerText = isDark ? "☀️" : "🌙";
});





















