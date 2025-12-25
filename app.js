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
  return data.secure_url;
}

// =======================
// 🔹 LOGIN
// =======================
window.login = () => {
  signInWithPopup(auth, provider);
};

// =======================
// 🔹 AUTH UI LOGIC
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

  if (snap.exists()) {
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
// 🔹 SAVE PROFILE
// =======================
window.saveProfile = async () => {
  const user = auth.currentUser;

  await setDoc(doc(db, "users", user.uid), {
    name: document.getElementById("name").value.trim(),
    department: document.getElementById("department").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: user.email,
    createdAt: new Date()
  });

  location.reload();
};

// =======================
// 🔹 SUBMIT ITEM (VALIDATED)
// =======================
window.submitItem = async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("Please login first");
    return;
  }

  const itemName = document.getElementById("itemName").value.trim();
  const itemType = document.getElementById("itemType").value;
  const category = document.getElementById("itemCategory").value;
  const location = document.getElementById("itemLocation").value;
  const imageFile = document.getElementById("itemImage").files[0];

  // 🔒 HARD VALIDATION (IMPORTANT)
  if (!itemName) {
    alert("Please enter item name");
    return;
  }

  if (!itemType) {
    alert("Please select Lost or Found");
    return;
  }

  if (!category) {
    alert("Please select item category");
    return;
  }

  if (!location) {
    alert("Please select item location");
    return;
  }

  try {
    // Fetch user profile
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const userData = userSnap.data();

    let imageUrl = "";
    if (imageFile) {
      imageUrl = await uploadToCloudinary(imageFile);
    }

    await addDoc(collection(db, "items"), {
  itemName,
  type: itemType,
  category,
  location,
  imageUrl,

  posterName: userData.name,
  posterDepartment: userData.department, // ✅ ADD THIS
  posterPhone: userData.phone,
  posterEmail: user.email,
  postedBy: user.uid,

  createdAt: new Date()
  });
    alert("Item posted successfully");

    // Clear form
    document.getElementById("itemName").value = "";
    document.getElementById("itemType").value = "";
    document.getElementById("itemCategory").value = "";
    document.getElementById("itemLocation").value = "";
    document.getElementById("itemImage").value = "";

    loadItems();

  } catch (error) {
    alert("Error posting item");
    console.error(error);
  }
};

// =======================
// 🔹 LOAD FEED (FINAL)
// =======================
async function loadItems() {
  const container = document.getElementById("itemsContainer");
  container.innerHTML = "";

  const q = query(
    collection(db, "items"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  snap.forEach((doc) => {
    const x = doc.data();

    container.innerHTML += `
      <div class="item-card">
        ${x.imageUrl ? `<img src="${x.imageUrl}" class="item-img" />` : ""}

        <div class="item-content">
          <!-- Item Name -->
          <h3 class="item-title">${x.itemName}</h3>

          <!-- Status & Category -->
          <p class="item-meta">
            <strong>Status:</strong> ${x.type}
            <span class="dot">•</span>
            <strong>Category:</strong> ${x.category}
          </p>

          <!-- Location -->
          <p class="item-location">
            📍 <strong>Location:</strong> ${x.location}
          </p>

          <!-- Posted by -->
         <p class="item-owner">
            👤 <strong>Posted by:</strong> ${x.posterName}
            ${x.posterDepartment ? `(${x.posterDepartment.toUpperCase()})` : ""}
          </p>

          <!-- Contact -->
          <div class="contact-actions">
            ${
              x.posterPhone
                ? `<a class="contact-btn call" href="tel:${x.posterPhone}">📞 Call</a>`
                : ""
            }
            ${
              x.posterEmail
                ? `<a class="contact-btn email" href="mailto:${x.posterEmail}">✉️ Email</a>`
                : ""
            }
          </div>
        </div>
      </div>
    `;
  });
}