// =======================
// 🔹 IMPORTS
// =======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =======================
// 🔹 FIREBASE CONFIG
// =======================
const firebaseConfig = {
  apiKey: "AIzaSyANWRyXfiPLy83GohdmMj06Wyiqas5juNI",
  authDomain: "campusfind-241ad.firebaseapp.com",
  projectId: "campusfind-241ad",
  messagingSenderId: "618393856752",
  appId: "1:618393856752:web:6d5698fa3225b2f1983035"
};

// =======================
// 🔹 INIT
// =======================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// =======================
// 🔹 STATE
// =======================
let isSubmitting = false;
let lastSubmitTime = 0;
const SUBMIT_COOLDOWN = 4000;

// =======================
// 🔹 CLOUDINARY
// =======================
async function uploadToCloudinary(file) {
  const CLOUD_NAME = "dnm0amwng";
  const UPLOAD_PRESET = "campusfind_unsigned";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  const data = await res.json();
  return data.secure_url || "";
}

// =======================
// 🔹 LOGIN
// =======================
window.login = () => {
  signInWithPopup(auth, provider).catch(console.error);
};

// =======================
// 🔹 AUTH UI
// =======================
onAuthStateChanged(auth, async (user) => {
  const login = document.getElementById("loginSection");
  const profile = document.getElementById("profileSection");
  const post = document.getElementById("postSection");
  const feed = document.getElementById("feedSection");

  if (!user) {
    login.style.display = "block";
    profile.style.display = "none";
    post.style.display = "none";
    feed.style.display = "none";
    return;
  }

  login.style.display = "none";

  const snap = await getDoc(doc(db, "users", user.uid));

  if (snap.exists() && snap.data().name && snap.data().phone) {
    profile.style.display = "none";
    post.style.display = "block";
    feed.style.display = "block";
    loadItems();
  } else {
    profile.style.display = "block";
    post.style.display = "none";
    feed.style.display = "none";
  }
});

// =======================
// 🔹 IMAGE HELPER TEXT (VISUAL ONLY)
// =======================
document.addEventListener("DOMContentLoaded", () => {
  const itemType = document.getElementById("itemType");
  const imageHint = document.getElementById("imageHint");

  if (!itemType || !imageHint) return;

  const updateHint = () => {
    imageHint.textContent =
      itemType.value === "Found"
        ? "Image required for Found items"
        : "Image optional for Lost items";
  };

  updateHint();
  itemType.addEventListener("change", updateHint);
});

// =======================
// 🔹 SAVE PROFILE
// =======================
window.saveProfile = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();

  if (!name || !phone) {
    alert("Please complete your profile");
    return;
  }

  await setDoc(doc(db, "users", user.uid), {
    name,
    department: document.getElementById("department").value.trim(),
    phone,
    email: user.email,
    createdAt: new Date()
  });

  location.reload();
};

// =======================
// 🔹 SUBMIT ITEM (FINAL LOGIC)
// =======================
window.submitItem = async () => {
  if (isSubmitting) return;

  const now = Date.now();
  if (now - lastSubmitTime < SUBMIT_COOLDOWN) return;

  const submitBtn = document.getElementById("submitItemBtn");
  submitBtn.disabled = true;
  submitBtn.innerText = "Submitting…";

  isSubmitting = true;
  lastSubmitTime = now;

  const user = auth.currentUser;
  if (!user) {
    unlockSubmit();
    return;
  }

  const itemName = document.getElementById("itemName").value.trim();
  const itemType = document.getElementById("itemType").value;
  const category = document.getElementById("itemCategory").value;
  const location = document.getElementById("itemLocation").value;
  const imageFile = document.getElementById("itemImage").files[0];

  // Required fields
  if (!itemName || !itemType || !category || !location) {
    unlockSubmit();
    return;
  }

  // 🔒 HARD RULE: Found item MUST have image
  if (itemType === "Found" && !imageFile) {
    alert("Please upload an image for Found items.");
    unlockSubmit();
    return;
  }

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const userData = userSnap.data();

    let imageUrl = "";
    if (imageFile) imageUrl = await uploadToCloudinary(imageFile);

    await addDoc(collection(db, "items"), {
      itemName,
      type: itemType,
      category,
      location,
      imageUrl,
      posterName: userData.name,
      posterDepartment: userData.department,
      posterPhone: userData.phone,
      posterEmail: user.email,
      postedBy: user.uid,
      status: "active",
      createdAt: new Date()
    });

    clearForm();
    loadItems();
    showSuccessMessage();

  } catch (err) {
    console.error(err);
    unlockSubmit();
  }
};

// =======================
// 🔹 HELPERS
// =======================
function unlockSubmit() {
  const btn = document.getElementById("submitItemBtn");
  btn.disabled = false;
  btn.innerText = "Submit Item";
  isSubmitting = false;
}

function clearForm() {
  ["itemName", "itemType", "itemCategory", "itemLocation", "itemImage"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
}

function showSuccessMessage() {
  const msg = document.getElementById("successMsg");
  const submitBtn = document.getElementById("submitItemBtn");
  const postAnotherBtn = document.getElementById("postAnother");

  msg.style.display = "block";
  postAnotherBtn.style.display = "inline-block";

  submitBtn.disabled = true;
  submitBtn.innerText = "Submitted";

  postAnotherBtn.onclick = () => {
    msg.style.display = "none";
    postAnotherBtn.style.display = "none";
    submitBtn.disabled = false;
    submitBtn.innerText = "Submit Item";
    isSubmitting = false;
    lastSubmitTime = 0;
    document.getElementById("itemName").focus();
  };
}

// =======================
// 🔹 LOAD FEED
// =======================
async function loadItems() {
  const container = document.getElementById("itemsContainer");
  container.innerHTML = "";

  const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  snap.forEach(d => {
    const x = d.data();
    if (x.status === "resolved") return;

    const isOwner = auth.currentUser?.uid === x.postedBy;

    container.innerHTML += `
      <div class="item-card">
        ${x.imageUrl ? `<img src="${x.imageUrl}" class="item-img">` : ""}
        <div class="item-content">
          <h3 class="item-title">${x.itemName}</h3>
          <p><strong>Status:</strong> ${x.type} • <strong>Category:</strong> ${x.category}</p>
          <p>📍 <strong>Location:</strong> ${x.location}</p>
          <p>👤 <strong>Posted by:</strong> ${x.posterName}</p>

          <div class="contact-actions">
            ${x.posterPhone ? `<a href="tel:${x.posterPhone}" class="contact-btn call">📞 Call</a>` : ""}
            ${x.posterEmail ? `<a href="mailto:${x.posterEmail}" class="contact-btn email">✉️ Email</a>` : ""}
          </div>

          ${isOwner ? `
            <button class="contact-btn danger" onclick="markResolved('${d.id}')">
              Mark as Resolved
            </button>
          ` : ""}
        </div>
      </div>
    `;
  });
}

// =======================
// 🔹 MARK AS RESOLVED
// =======================
window.markResolved = async (id) => {
  if (!confirm("Mark this item as resolved?")) return;

  await updateDoc(doc(db, "items", id), {
    status: "resolved",
    resolvedAt: new Date()
  });

  loadItems();
};