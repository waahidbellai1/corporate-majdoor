import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyDv8-8o_pd9ZUxxazTbBH5xBb_olbuhyag",
  authDomain: "corporate-majdoor.firebaseapp.com",
  projectId: "corporate-majdoor"
});

const auth = getAuth(app);
const db = getFirestore(app);

const authSection = document.getElementById("authSection");
const postSection = document.getElementById("postSection");
const feed = document.getElementById("feed");
const notifications = document.getElementById("notifications");
const logoutBtn = document.getElementById("logoutBtn");

const email = document.getElementById("email");
const password = document.getElementById("password");
const username = document.getElementById("username");
const postInput = document.getElementById("postInput");

document.getElementById("loginBtn").onclick = () =>
  signInWithEmailAndPassword(auth, email.value, password.value);

document.getElementById("signupBtn").onclick = async () => {
  const cred = await createUserWithEmailAndPassword(auth, email.value, password.value);
  await setDoc(doc(db, "users", cred.user.uid), {
    username: username.value.trim()
  });
};

logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  if (user) {
    authSection.style.display = "none";
    postSection.style.display = "block";
    feed.style.display = "block";
    notifications.style.display = "block";
    logoutBtn.style.display = "block";
  } else {
    authSection.style.display = "block";
    postSection.style.display = "none";
    feed.style.display = "none";
    notifications.style.display = "none";
    logoutBtn.style.display = "none";
  }
});

/* THEME */
const toggle = document.getElementById("themeToggle");
toggle.onclick = () => document.body.classList.toggle("dark");
