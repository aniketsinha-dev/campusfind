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
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "campusfind_unsigned");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dnm0amwng/image/upload",
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
// 🔹 AUTH UI (MAIN PAGE ONLY)
// =======================
onAuthStateChanged(auth, async (user) => {
  const login = document.getElementById("loginSection");
  const profileSetup = document.getElementById("profileSection");
  const post = document.getElementById("postSection");
  const feed = document.getElementById("feedSection");

  if (!user) {
    login.style.display = "block";
    profileSetup.style.display = post.style.display = feed.style.display = "none";
    return;
  }

  login.style.display = "none";

  const snap = await getDoc(doc(db, "users", user.uid));

  if (snap.exists() && snap.data().name && snap.data().phone) {
    profileSetup.style.display = "none";
    post.style.display = feed.style.display = "block";
    loadItems();
  } else {
    profileSetup.style.display = "block";
    post.style.display = feed.style.display = "none";
  }
});

// =======================
// 🔹 IMAGE REQUIREMENT LOGIC (FIXED)
// =======================
document.addEventListener("DOMContentLoaded", () => {
  const itemType = document.getElementById("itemType");
  const imageHint = document.getElementById("imageHint");
  const itemImage = document.getElementById("itemImage");

  if (!itemType || !imageHint || !itemImage) return;

  const updateImageRule = () => {
    if (itemType.value === "Found") {
      imageHint.textContent = "Image is required for Found items";
      imageHint.style.opacity = "1";
      itemImage.required = true;
    } else {
      imageHint.textContent = "Image optional for Lost items";
      imageHint.style.opacity = "0.7";
      itemImage.required = false;
    }
  };

  updateImageRule();
  itemType.addEventListener("change", updateImageRule);
});

// =======================
// 🔹 TIME AGO
// =======================
function timeAgo(timestamp) {
  if (!timestamp) return "";
  const seconds = Math.floor((Date.now() - timestamp.toMillis()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return `${Math.floor(days / 7)} week ago`;
}

function capitalize(text = "") {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}



// =======================
// 🔹 LOAD FEED
// =======================
async function loadItems() {
  const container = document.getElementById("itemsContainer");
  const empty = document.getElementById("emptyFeed");

  container.innerHTML = "";
  empty.style.display = "none";

  const snap = await getDocs(
    query(collection(db, "items"), orderBy("createdAt", "desc"))
  );

  if (snap.empty) {
    empty.style.display = "block";
    return;
  }

  snap.forEach(d => {
    const x = d.data();
    const isResolved = x.status === "resolved";

    const timelineText = isResolved
      ? `Resolved · ${timeAgo(x.resolvedAt)}`
      : `Posted · ${timeAgo(x.createdAt)}`;

    container.innerHTML += `
  <div class="item-card ${isResolved ? "resolved" : ""}">

    <div class="item-img-wrapper">
      ${
        x.imageUrl
          ? `<img src="${x.imageUrl}" class="item-img">`
          : `<div class="item-img placeholder">📷</div>`
      }
    </div>

    <div class="item-content">

      <div class="timeline-text">
        ${isResolved ? "Resolved" : "Posted"} · ${timeAgo(isResolved ? x.resolvedAt : x.createdAt)}
      </div>

      <span class="badge ${
        isResolved ? "resolved" : x.type === "Lost" ? "lost" : "found"
      }">
        ${isResolved ? "Resolved" : x.type}
      </span>

      <h3 class="item-title">${capitalize(x.itemName)}</h3>

      <p>📦 <strong>Category:</strong> ${x.category}</p>
      <p>📍 <strong>Location:</strong> ${x.location}</p>
      <p>👤 <strong>Posted by:</strong> ${x.posterName}</p>

      ${
        !isResolved
          ? `<div class="contact-actions">
              ${x.posterPhone ? `<a href="tel:${x.posterPhone}" class="contact-btn call">Call</a>` : ""}
              ${x.posterEmail ? `<a href="mailto:${x.posterEmail}" class="contact-btn email">Email</a>` : ""}
            </div>`
          : ""
      }

    </div>
  </div>
`;
  });
}

// =======================
// 🔹 SUBMIT ITEM
// =======================
window.submitItem = async () => {
  if (isSubmitting) return;
  if (Date.now() - lastSubmitTime < SUBMIT_COOLDOWN) return;

  const itemName = document.getElementById("itemName");
  const itemType = document.getElementById("itemType");
  const itemCategory = document.getElementById("itemCategory");
  const itemLocation = document.getElementById("itemLocation");
  const itemImage = document.getElementById("itemImage");
  const imageHint = document.getElementById("imageHint");
  const submitBtn = document.getElementById("submitItemBtn");

  submitBtn.disabled = true;
  submitBtn.innerText = "Submitting…";

  isSubmitting = true;
  lastSubmitTime = Date.now();

  if (!itemName.value || !itemType.value || !itemCategory.value || !itemLocation.value) {
    unlockSubmit();
    return;
  }

  if (itemType.value === "Found" && !itemImage.files[0]) {
    imageHint.textContent = "Please add an image to help others identify it";
    unlockSubmit();
    return;
  }

  const user = auth.currentUser;
  const snap = await getDoc(doc(db, "users", user.uid));
  const userData = snap.data();

  let imageUrl = "";
  if (itemImage.files[0]) {
    imageUrl = await uploadToCloudinary(itemImage.files[0]);
  }

  await addDoc(collection(db, "items"), {
    itemName: itemName.value.trim(),
    type: itemType.value,
    category: itemCategory.value,
    location: itemLocation.value,
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
    .forEach(id => (document.getElementById(id).value = ""));
}

function showSuccessMessage() {
  const msg = document.getElementById("successMsg");
  const btn = document.getElementById("submitItemBtn");
  const postAnother = document.getElementById("postAnother");

  msg.style.display = "block";
  btn.innerText = "Submitted";
  btn.disabled = true;

  postAnother.onclick = () => {
    msg.style.display = "none";
    unlockSubmit();
    document.getElementById("itemName").focus();
  };
}

// =======================
// 🔹 PROFILE FUNCTIONS (NOT AUTO-RUN)
// =======================
// These will be reused in profile.html later
export async function loadProfileDashboard() {}
export async function loadMyPosts() {}
export async function updateProfile() {}


// =======================
// 🔹 NAVIGATION
// =======================
window.goToProfile = () => {
  window.location.href = "profile.html";
};

// =======================
// 🔹 SAVE PROFILE 
// =======================
window.saveProfile = async function () {
  const nameInput = document.getElementById("name");
  const departmentInput = document.getElementById("department"); // ✅ FIXED ID
  const phoneInput = document.getElementById("phone");

  const name = nameInput.value.trim();
  const department = departmentInput.value.trim(); // optional
  const phone = phoneInput.value.trim();

  // ✅ Only required fields
  if (!name || !phone) {
    alert("Please fill all required fields");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("User not logged in");
    return;
  }

  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        name,
        department, // can be empty
        phone,
        email: user.email,
        updatedAt: new Date()
      },
      { merge: true }
    );

    // ✅ Redirect back to feed
    window.location.href = "index.html";
  } catch (err) {
    console.error("Save profile failed:", err);
    alert("Failed to save profile. Check console.");
  }
};