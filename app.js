/* =====================
   FIREBASE IMPORTS
===================== */
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
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =====================
   FIREBASE INIT
===================== */
const app = initializeApp({
  apiKey: "AIzaSyDv8-8o_pd9ZUxxazTbBH5xBb_olbuhyag",
  authDomain: "corporate-majdoor.firebaseapp.com",
  projectId: "corporate-majdoor"
});

const auth = getAuth(app);
const db = getFirestore(app);

/* =====================
   HELPERS
===================== */
const $ = id => document.getElementById(id);
const userCache = {};

function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* =====================
   ELEMENTS
===================== */
const authSection = $("authSection");
const postSection = $("postSection");
const feed = $("feed");
const status = $("status");

const loginBtn = $("loginBtn");
const signupBtn = $("signupBtn");
const email = $("email");
const password = $("password");
const username = $("username");

const postInput = $("postInput");
const postBtn = $("postBtn");

/* Menus */
const profileBtn = $("profileBtn");
const profileMenu = $("profileMenu");
const profileLogout = $("profileLogout");

const bottomProfileBtn = $("bottomProfileBtn");
const profileSheet = $("profileSheet");
const sheetOverlay = $("profileSheetOverlay");
const sheetLogoutBtn = $("sheetLogoutBtn");
const sheetThemeToggle = $("sheetThemeToggle");

/* Notifications */
const notifBell = $("notifBell");
const notifications = $("notifications");
const notificationList = $("notificationList");

/* Theme */
const themeToggle = $("themeToggle");
const appLogo = $("appLogo");

/* =====================
   THEME
===================== */
function updateLogo() {
  if (!appLogo) return;
  appLogo.src = document.body.classList.contains("dark")
    ? "logo-dark.png"
    : "logo-light.png";
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
  updateLogo();
}

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}
updateLogo();

themeToggle?.addEventListener("click", toggleTheme);
sheetThemeToggle?.addEventListener("click", () => {
  toggleTheme();
  profileSheet?.classList.remove("open");
  sheetOverlay?.classList.remove("open");
});

/* =====================
   AUTH
===================== */
loginBtn?.addEventListener("click", () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .catch(e => status.innerText = e.message);
});

signupBtn?.addEventListener("click", async () => {
  if (!username.value.trim()) return status.innerText = "Username required";

  const cred = await createUserWithEmailAndPassword(
    auth,
    email.value,
    password.value
  );

  await setDoc(doc(db, "users", cred.user.uid), {
    username: username.value.trim()
  });
});

profileLogout?.addEventListener("click", () => signOut(auth));
sheetLogoutBtn?.addEventListener("click", () => signOut(auth));

/* =====================
   MENUS
===================== */
profileBtn?.addEventListener("click", e => {
  e.stopPropagation();
  profileMenu?.classList.toggle("open");
  notifications.classList.remove("open"); // ✅ FIXED
});


bottomProfileBtn?.addEventListener("click", () => {
  profileSheet?.classList.add("open");
  sheetOverlay?.classList.add("open");
});

sheetOverlay?.addEventListener("click", () => {
  profileSheet?.classList.remove("open");
  sheetOverlay?.classList.remove("open");
});

/* =====================
   NOTIFICATIONS UI
===================== */
function toggleNotifications() {
  if (!notifications) return;
  notifications.classList.toggle("open");
  profileMenu?.classList.remove("open");
}


notifBell?.addEventListener("click", e => {
  e.stopPropagation();
  toggleNotifications();
});

bottomNotifBtn?.addEventListener("click", e => {
  e.stopPropagation();
  toggleNotifications();
});


document.addEventListener("click", e => {
  if (!notifications?.classList.contains("open")) return;

  if (
    !notifications.contains(e.target) &&
    !notifBell.contains(e.target)
  ) {
    notifications.classList.remove("open");
  }
});
notifications?.addEventListener("click", e => e.stopPropagation());


/* =====================
   POSTS + COMMENTS
===================== */
function listenToPosts(user) {
  return onSnapshot(
    query(collection(db, "posts"), orderBy("createdAt", "desc")),
    async snap => {
      feed.innerHTML = "";

      for (const d of snap.docs) {
        const data = d.data();
        const liked = (data.likedBy || []).includes(user.uid);

        let name = userCache[data.uid];
        if (!name) {
          const u = await getDoc(doc(db, "users", data.uid));
          name = u.exists() ? u.data().username : "user";
          userCache[data.uid] = name;
        }

        const post = document.createElement("div");
        post.className = "post";

        post.innerHTML = `
          <div class="post-header">
            <div class="post-header-left">
              <div class="avatar">${name[0]}</div>
              <div>
                <div class="post-username">${name}</div>
                <div class="post-time">${timeAgo(data.createdAt)}</div>
              </div>
            </div>
          </div>

           ${auth.currentUser && data.uid === auth.currentUser.uid
      ? `<button class="delete-post" title="Delete post">🗑</button>`
      : ""}
  </div>

          <div class="post-text">${data.text}</div>

          <div class="post-actions">
            <button class="likeBtn ${liked ? "liked" : ""}">👍 Like</button>
            ${data.likedBy?.length ? `<span class="likeCount">${data.likedBy.length}</span>` : ""}
          </div>

          <div class="comments">
            <div class="comment-list"></div>
            <div class="comment-box">
              <input class="comment-input" placeholder="Write a comment…" />
              <button class="send-comment">Post</button>
            </div>
          </div>
        `;

        /* LIKE POST + NOTIFICATION */
        post.querySelector(".likeBtn")?.addEventListener("click", async () => {
          await updateDoc(doc(db, "posts", d.id), {
            likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid)
          });

          if (!liked && data.uid !== user.uid) {
            await addDoc(collection(db, "notifications"), {
              to: data.uid,
              from: user.uid,
              type: "like",
              postId: d.id,
              text: `${name} liked your post`,
              createdAt: serverTimestamp(),
              read: false
            });
          }
        });

        /* DELETE POST */
const delBtn = post.querySelector(".delete-post");
delBtn?.addEventListener("click", async e => {
  e.stopPropagation();
  if (confirm("Delete this post?")) {
    await deleteDoc(doc(db, "posts", d.id));
  }
});


        /* COMMENTS */
        const list = post.querySelector(".comment-list");
        const input = post.querySelector(".comment-input");
        const sendBtn = post.querySelector(".send-comment");

        onSnapshot(
          query(collection(db, "posts", d.id, "comments"), orderBy("createdAt")),
          async snap => {
            list.innerHTML = "";
            const docs = snap.docs;
            const visible = docs.slice(0, 1);
            const hidden = docs.slice(1);

            async function render(c) {
              const cd = c.data();
              let cn = userCache[cd.uid];
              if (!cn) {
                const u = await getDoc(doc(db, "users", cd.uid));
                cn = u.exists() ? u.data().username : "user";
                userCache[cd.uid] = cn;
              }

              return `
                <div class="comment-item">
                  <div class="comment-bubble"><strong>${cn}</strong> ${cd.text}</div>
                </div>
              `;
            }

            for (const c of visible) list.innerHTML += await render(c);

            if (hidden.length) {
              list.innerHTML += `<button class="view-more-comments">View ${hidden.length} more comments</button>`;
              const html = await Promise.all(hidden.map(render));
              list.innerHTML += `<div class="hidden hidden-comments">${html.join("")}</div>`;
            }

            list.querySelector(".view-more-comments")?.addEventListener("click", e => {
              list.querySelector(".hidden-comments").classList.remove("hidden");
              e.target.remove();
            });
          }
        );

        sendBtn?.addEventListener("click", async () => {
          if (!input.value.trim()) return;

          await addDoc(collection(db, "posts", d.id, "comments"), {
            text: input.value.trim(),
            uid: user.uid,
            createdAt: serverTimestamp()
          });

          if (data.uid !== user.uid) {
            await addDoc(collection(db, "notifications"), {
              to: data.uid,
              from: user.uid,
              type: "comment",
              postId: d.id,
              text: `${name} commented on your post`,
              createdAt: serverTimestamp(),
              read: false
            });
          }

          input.value = "";
        });

        feed.appendChild(post);
      }
    }
  );
}

/* =====================
   NOTIFICATION LISTENER
===================== */
function listenToNotifications(user) {
  return onSnapshot(
    query(
      collection(db, "notifications"),
      where("to", "==", user.uid),
      orderBy("createdAt", "desc")
    ),
    snap => {
      notificationList.innerHTML = "";

      if (snap.empty) {
        notificationList.innerHTML = `
          <div class="notification empty">🎉 You're all caught up</div>
        `;
        return;
      }

      snap.forEach(d => {
        notificationList.innerHTML += `
          <div class="notification">${d.data().text}</div>
        `;
      });
    }
  );
}

/* =====================
   CREATE POST
===================== */
postBtn?.addEventListener("click", async () => {
  if (!postInput.value.trim()) return;
  await addDoc(collection(db, "posts"), {
    text: postInput.value.trim(),
    uid: auth.currentUser.uid,
    createdAt: serverTimestamp(),
    likedBy: []
  });
  postInput.value = "";
});

/* =====================
   AUTH STATE
===================== */
let unsubPosts = null;
let unsubNotifs = null;

onAuthStateChanged(auth, user => {
  document.body.className = "";

  unsubPosts?.();
  unsubNotifs?.();

  if (user) {
    document.body.classList.add("is-authenticated");
    authSection.style.display = "none";
    postSection.style.display = "block";
    feed.style.display = "flex";
    notifications.classList.remove("open");

    unsubPosts = listenToPosts(user);
    unsubNotifs = listenToNotifications(user);

  } else {
    document.body.classList.add("is-logged-out");
    authSection.style.display = "block";
    postSection.style.display = "none";
    feed.innerHTML = "";
    notifications.classList.remove("open");
    notificationList.innerHTML = "";

    profileMenu?.classList.remove("open");
    profileSheet?.classList.remove("open");
    sheetOverlay?.classList.remove("open");
  }
});
