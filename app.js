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
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* FIREBASE */
const app = initializeApp({
  apiKey: "AIzaSyDv8-8o_pd9ZUxxazTbBH5xBb_olbuhyag",
  authDomain: "corporate-majdoor.firebaseapp.com",
  projectId: "corporate-majdoor",
  storageBucket: "corporate-majdoor.appspot.com",
  messagingSenderId: "490168158830",
  appId: "1:490168158830:web:bde232dae0cff6ab8bb47f"
});
const auth = getAuth(app);
const db = getFirestore(app);

/* ELEMENTS */
const feed = document.getElementById("feed");
const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");
const status = document.getElementById("status");
const logoutBtn = document.getElementById("logoutBtn");

/* HELPERS */
const timeAgo = ts => ts ? Math.floor((Date.now()-ts.toMillis())/60000)+"m ago" : "";

/* AUTH */
loginBtn.onclick = () =>
  signInWithEmailAndPassword(auth, email.value, password.value)
    .catch(e => status.innerText = e.message);

signupBtn.onclick = async () => {
  const cred = await createUserWithEmailAndPassword(auth,email.value,password.value);
  await setDoc(doc(db,"users",cred.user.uid),{
    username: username.value,
    email: cred.user.email
  });
};

logoutBtn.onclick = () => signOut(auth);

/* POST */
postBtn.onclick = async () => {
  await addDoc(collection(db,"posts"),{
    text: postInput.value,
    uid: auth.currentUser.uid,
    createdAt: serverTimestamp(),
    likedBy: []
  });
  postInput.value = "";
};

/* FEED */
const q = query(collection(db,"posts"), orderBy("createdAt","desc"));

onSnapshot(q, snap => {
  feed.innerHTML = "";
  snap.forEach(async d => {
    const data = d.data();
    const user = await getDoc(doc(db,"users",data.uid));
    const name = user.data().username;

    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `
      <div class="post-header">
        <div class="post-header-left">
          <div class="avatar">${name[0]}</div>
          <div>
            <div class="post-username">${name}</div>
            <div class="post-time">${timeAgo(data.createdAt)}</div>
          </div>
        </div>
        ${auth.currentUser.uid===data.uid?`
        <div class="post-menu">
          <button class="menu-btn">⋯</button>
          <div class="menu-dropdown">
            <button class="deleteBtn">Delete</button>
          </div>
        </div>`:""}
      </div>

      <div class="post-text">${data.text}</div>

      <div class="post-actions">
        <button class="likeBtn ${data.likedBy.includes(auth.currentUser.uid)?"liked":""}">
          👍 Like
        </button>
        ${data.likedBy.length?`<span class="likeCount">${data.likedBy.length}</span>`:""}
      </div>

      <div class="comments">
        <input class="commentInput" placeholder="Add comment…" />
        <div class="commentList"></div>
      </div>
    `;

    /* LIKE + NOTIFICATION */
    div.querySelector(".likeBtn").onclick = async () => {
      const ref = doc(db,"posts",d.id);
      const liked = data.likedBy.includes(auth.currentUser.uid);
      await updateDoc(ref,{
        likedBy: liked?arrayRemove(auth.currentUser.uid):arrayUnion(auth.currentUser.uid)
      });
      if(!liked && data.uid!==auth.currentUser.uid){
        await addDoc(collection(db,"notifications"),{
          to: data.uid,
          text: `${auth.currentUser.email} liked your post`,
          createdAt: serverTimestamp()
        });
      }
    };

    /* DELETE */
    const del = div.querySelector(".deleteBtn");
    if(del) del.onclick = ()=>deleteDoc(doc(db,"posts",d.id));

    /* COMMENTS */
    const commentInput = div.querySelector(".commentInput");
    const commentList = div.querySelector(".commentList");

    onSnapshot(collection(db,"posts",d.id,"comments"), cs => {
      commentList.innerHTML="";
      cs.forEach(c=>{
        commentList.innerHTML+=`<div class="comment">${c.data().text}</div>`;
      });
    });

    commentInput.onkeypress = async e => {
      if(e.key==="Enter"){
        await addDoc(collection(db,"posts",d.id,"comments"),{
          text: commentInput.value,
          createdAt: serverTimestamp()
        });
        commentInput.value="";
        if(data.uid!==auth.currentUser.uid){
          await addDoc(collection(db,"notifications"),{
            to: data.uid,
            text:`New comment on your post`,
            createdAt: serverTimestamp()
          });
        }
      }
    };

    feed.appendChild(div);
  });
});

/* NOTIFICATIONS */
onSnapshot(query(collection(db,"notifications"),orderBy("createdAt","desc")),snap=>{
  notificationList.innerHTML="";
  snap.forEach(n=>{
    if(n.data().to===auth.currentUser.uid){
      notificationList.innerHTML+=`<div class="notification">${n.data().text}</div>`;
    }
  });
});
