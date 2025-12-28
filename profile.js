// =======================
// 🔹 IMPORTS
// =======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
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
const db = getFirestore(app);

// =======================
// 🔹 DOM ELEMENTS
// =======================
let myItemsContainer;
let profileEmpty;

let editName;
let editDepartment;
let editPhone;

let profileName;
let profileEmail;
let profileAvatar;
let updateProfileBtn;

// =======================
// 🔹 DOM READY
// =======================
document.addEventListener("DOMContentLoaded", () => {
  myItemsContainer = document.getElementById("myItemsContainer");
  profileEmpty = document.getElementById("profileEmpty");

  editName = document.getElementById("editName");
  editDepartment = document.getElementById("editDepartment");
  editPhone = document.getElementById("editPhone");

  profileName = document.getElementById("profileName");
  profileEmail = document.getElementById("profileEmail");
  profileAvatar = document.getElementById("profileAvatar");

  updateProfileBtn = document.getElementById("updateProfileBtn");

  attachProfileUpdateHandler();
});

// =======================
// 🔹 AUTH CHECK
// =======================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  await loadProfile(user);
  await loadMyPosts(user.uid);
});

// =======================
// 🔹 LOAD PROFILE (SAFE)
// =======================
async function loadProfile(user) {
  try {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {
      console.warn("No profile found");
      return;
    }

    const data = snap.data();

    // 🔒 SAFELY FETCH DOM ELEMENTS HERE
    const profileNameEl = document.getElementById("profileName");
    const profileEmailEl = document.getElementById("profileEmail");
    const profileAvatarEl = document.getElementById("profileAvatar");

    const editNameEl = document.getElementById("editName");
    const editDepartmentEl = document.getElementById("editDepartment");
    const editPhoneEl = document.getElementById("editPhone");

    // ===== PROFILE HEADER =====
    if (profileNameEl) profileNameEl.textContent = data.name || "Your Name";
    if (profileEmailEl) profileEmailEl.textContent = user.email || "";
    if (profileAvatarEl)
      profileAvatarEl.textContent = (data.name || "U").charAt(0).toUpperCase();

    // ===== EDIT FORM PREFILL =====
    if (editNameEl) editNameEl.value = data.name || "";
    if (editDepartmentEl) editDepartmentEl.value = data.department || "";
    if (editPhoneEl) editPhoneEl.value = data.phone || "";

  } catch (err) {
    console.error("Failed to load profile:", err);
  }
}

// =======================
// 🔹 UPDATE PROFILE
// =======================
function attachProfileUpdateHandler() {
  if (!updateProfileBtn) return;

  updateProfileBtn.onclick = async () => {
    const name = editName.value.trim();
    const department = editDepartment.value.trim();
    const phone = editPhone.value.trim();

    if (!name || !phone) {
      alert("Name and phone are required");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        name,
        department,
        phone,
        updatedAt: new Date()
      });

      // Update header instantly (no reload)
      profileName.textContent = name;
      profileAvatar.textContent = name.charAt(0).toUpperCase();

      alert("Profile updated");
    } catch (err) {
      console.error(err);
      alert("Update failed");
    }
  };
}

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
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function capitalize(text = "") {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// =======================
// 🔹 LOAD MY POSTS
// =======================
async function loadMyPosts(uid) {
  myItemsContainer.innerHTML = "";
  profileEmpty.style.display = "none";

  const snap = await getDocs(
    query(collection(db, "items"), orderBy("createdAt", "desc"))
  );

  let hasPosts = false;

  snap.forEach(d => {
    const x = d.data();
    if (x.postedBy !== uid) return;

    hasPosts = true;
    const isResolved = x.status === "resolved";

    myItemsContainer.innerHTML += `
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
                ${
                    isResolved
                    ? `Resolved · ${timeAgo(x.resolvedAt)}`
                    : `Posted · ${timeAgo(x.createdAt)}`
                }
            </div>

            <span class="badge ${
                isResolved ? "resolved" : x.type === "Lost" ? "lost" : "found"
            }">
                ${isResolved ? "Resolved" : x.type}
            </span>

            <h3 class="item-title">${capitalize(x.itemName)}</h3>

            <p>📦 <strong>Category:</strong> ${x.category}</p>
            <p>📍 <strong>Location:</strong> ${x.location}</p>

            ${
                !isResolved
                ? `<button class="profile-resolve-btn"
                    onclick="markResolved('${d.id}', this)">
                    Mark as Resolved
                    </button>`
                : ""
            }

            </div>
      </div>
    `;
  });

  if (!hasPosts) {
    profileEmpty.style.display = "block";
  }
}

// =======================
// 🔹 MARK RESOLVED (PROFILE ONLY)
// =======================
window.markResolved = async (id, btn) => {
  const confirmResolve = confirm(
    "Once resolved, this item will no longer appear in the main feed.\n\nDo you want to continue?"
  );

  if (!confirmResolve) return;

  const card = btn.closest(".item-card");
  if (!card) return;

  // Smooth fade animation
  card.style.transition = "all 0.35s ease";
  card.style.opacity = "0";
  card.style.transform = "scale(0.96)";

  setTimeout(async () => {
    await updateDoc(doc(db, "items", id), {
      status: "resolved",
      resolvedAt: new Date()
    });

    const user = auth.currentUser;
    if (user) loadMyPosts(user.uid);
  }, 350);
};

// =======================
// 🔹 BACK NAVIGATION
// =======================
window.goBack = () => {
  window.location.href = "index.html";
};

// =======================
// 🔹 LOGOUT (PROFILE PAGE)
// =======================
window.logout = async () => {
  try {
    await auth.signOut();
    window.location.href = "index.html";
  } catch (err) {
    console.error("Logout failed:", err);
    alert("Logout failed. Try again.");
  }
};