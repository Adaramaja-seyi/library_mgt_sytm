// Data storage
let books = JSON.parse(localStorage.getItem("books")) || [];
let borrowingHistory =
  JSON.parse(localStorage.getItem("borrowingHistory")) || [];
let wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
let users = JSON.parse(localStorage.getItem("users")) || [];
let currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;

// Initialize and retrieve admin email from localStorage
function getAdminEmail() {
  let adminEmail = localStorage.getItem("adminEmail");
  if (!adminEmail) {
    adminEmail = "admin@example.com";
    localStorage.setItem("adminEmail", adminEmail);
  }
  return adminEmail;
}

// Set or update admin email in localStorage (for admin use)
function setAdminEmail(email) {
  if (!validateEmail(email)) {
    console.error("Invalid email format");
    return false;
  }
  localStorage.setItem("adminEmail", email.trim().toLowerCase());
  console.log(`Admin email set to: ${email}`);
  return true;
}

// Initialize application
async function lnitializeApp() {
  await loadInitialBooks();
  setupEventListeners();
  renderCatalog();
  renderUserBooks();
  updateNavbar();
}

// Load initial books from data.json
async function loadInitialBooks() {
  try {
    const response = await fetch("data.json");
    if (!response.ok) throw new Error("Failed to fetch initial books");
    const data = await response.json();
    if (books.length === 0) {
      books = data.initialBooks;
      saveData();
    }
  } catch (error) {
    console.error("Failed to load initial books:", error);
  }
}

// Save data to localStorage
function saveData() {
  localStorage.setItem("books", JSON.stringify(books));
  localStorage.setItem("borrowingHistory", JSON.stringify(borrowingHistory));
  localStorage.setItem("wishlist", JSON.stringify(wishlist));
  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("currentUser", JSON.stringify(currentUser));
}

// Generate unique ID
function generateId() {
  return Date.now() + Math.random().toString(36).substr(2, 9);
}

// Render book catalog
function renderCatalog() {
  const catalog = document.getElementById("bookCatalog");
  catalog.innerHTML = "";
  const search = document.getElementById("searchInput").value.toLowerCase();
  const genre = document.getElementById("genreFilter").value;
  const availability = document.getElementById("availabilityFilter").value;

  books
    .filter(
      (book) =>
        (!search ||
          book.title.toLowerCase().includes(search) ||
          book.author.toLowerCase().includes(search)) &&
        (!genre || book.genre === genre) &&
        (!availability || book.status === availability)
    )
    .forEach((book) => {
      const isWishlisted = wishlist.includes(book.id);
      catalog.innerHTML += `
                <div class="col-md-3 mb-4">
                    <div class="card book-card h-100">
                        <img src="${book.cover}" class="card-img-top" alt="${book.title
        }">
                        <div class="card-body">
                            <h5 class="card-title">${book.title}</h5>
                            <p class="card-text">Author: ${book.author}</p>
                            <p class="card-text">Genre: ${book.genre}</p>
                            <p class="card-text">Status: ${book.status}</p>
                            <button class="btn btn-sm btn-primary ${book.status === "Borrowed" ? "disabled" : ""
        }" 
                                    onclick="openBorrowModal(${book.id})">
                                <i class="fas fa-book"></i> Borrow
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" 
                                    onclick="toggleWishlist(${book.id})">
                                <i class="fas fa-heart ${isWishlisted ? "text-danger" : ""
        }"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
    });
}

// Render user-specific borrowed books
function renderUserBooks() {
  const userBooksSection = document.getElementById("userBooks");
  userBooksSection.innerHTML = "";

  if (!currentUser) {
    userBooksSection.innerHTML = "<p class='text-danger'>Please log in to view your borrowed books.</p>";
    return;
  }

  const userRecords = borrowingHistory.filter(record => record.userId === currentUser.id);
  if (userRecords.length === 0) {
    userBooksSection.innerHTML = "<p class='text-danger'>You haven't borrowed any books yet.</p>";
    return;
  }

  userRecords.forEach(record => {
    const book = books.find(b => b.id === record.bookId);
    userBooksSection.innerHTML += `
            <div class="col-md-4 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${book.title}</h5>
                        <p class="card-text">Author: ${book.author}</p>
                        <p class="card-text">Borrowed: ${new Date(record.borrowDate).toLocaleDateString()}</p>
                        <p class="card-text">Due: ${new Date(record.dueDate).toLocaleDateString()}</p>
                        <button class="btn btn-sm btn-success" 
                                onclick="returnBook(${record.bookId}, '${record.userId}')">Return</button>
                    </div>
                </div>
            </div>
        `;
  });
}

// show borrowed books in a modal when clicking "My Books"
function openMyBooksModal() {
  if (!currentUser) {
    openLoginModal();
    return;
  }
  const modal = new bootstrap.Modal(document.getElementById("myBooksModal"));
  const modalBody = document.getElementById("myBooksContent");
  modalBody.innerHTML = "";

  const userRecords = borrowingHistory.filter(record => record.userId === currentUser.id);
  if (userRecords.length === 0) {
    modalBody.innerHTML = "<p class='text-danger'>You haven't borrowed any books yet.</p>";
  } else {
    userRecords.forEach(record => {
      const book = books.find(b => b.id === record.bookId);
      modalBody.innerHTML += `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">${book.title}</h5>
                        <p class="card-text">Author: ${book.author}</p>
                        <p class="card-text">Borrowed: ${new Date(record.borrowDate).toLocaleDateString()}</p>
                        <p class="card-text">Due: ${new Date(record.dueDate).toLocaleDateString()}</p>
                        <button class="btn btn-sm btn-success" 
                                onclick="returnBook(${record.bookId}, '${record.userId}')">Return</button>
                    </div>
                </div>
            `;
    });
  }
  modal.show();
}

function openLoginModal() {
  const modal = new bootstrap.Modal(document.getElementById("loginModal"));
  modal.show();
}

// Input validation
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}

// User Authentication
function signupUser(username, email, password) {
  if (!validateName(username).isValid) return { success: false, message: "Invalid username" };
  if (!validateEmail(email)) return { success: false, message: "Invalid email" };
  if (!validatePassword(password)) return { success: false, message: "Password must be at least 6 characters" };
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, message: "Email already registered" };
  }

  const user = {
    id: generateId(),
    username,
    email,
    password,
    createdAt: new Date()
  };
  users.push(user);
  saveData();
  return { success: true, user };
}

function loginUser(email, password) {
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) return { success: false, message: "Invalid email or password" };
  currentUser = user;
  saveData();
  return { success: true, user };
}

function logoutUser() {
  currentUser = null;
  saveData();
  updateNavbar();
  renderCatalog();
  showToast("Logged out successfully!");
  window.location.reload()
}

// update the navbar based on login status
function updateNavbar() {
  const navItems = document.querySelector(".navbar-nav.ms-auto");
  const existingLogout = document.getElementById("logoutBtn");
  if (existingLogout) existingLogout.remove();

  if (currentUser) {
    const welcomeItem = document.createElement("li");
    welcomeItem.className = "nav-item";
    welcomeItem.innerHTML = `<span class="nav-link">Welcome, ${currentUser.username}</span>`;
    navItems.insertBefore(welcomeItem, navItems.lastElementChild);

    const logoutItem = document.createElement("li");
    logoutItem.className = "nav-item";
    logoutItem.id = "logoutBtn";
    logoutItem.innerHTML = `<button class="btn btn-link nav-link" onclick="logoutUser()">Logout</button>`;
    navItems.insertBefore(logoutItem, navItems.lastElementChild);
  }
}

function validateName(name) {
  const errors = [];
  if (name.length < 2) errors.push("Name must be at least 2 characters long");
  if (!/^[a-zA-Z\s]+$/.test(name))
    errors.push("Name should only contain letters or spaces");
  if (name !== name.trim())
    errors.push("Name should not start or end with space");
  return {
    isValid: errors.length === 0,
    messages: errors,
  };
}

// Form error handling
function showError(input, message) {
  input.classList.add("is-invalid");
  input.nextElementSibling.textContent = message;
}

function clearError(input) {
  input.classList.remove("is-invalid");
  input.nextElementSibling.textContent = "";
}

// handle direct borrowing for logged-in users.
function openBorrowModal(bookId) {
  if (!currentUser) {
    openSignupModal(bookId);
    return;
  }
  borrowBookDirectly(bookId);
}

function openSignupModal(bookId) {
  const modal = new bootstrap.Modal(document.getElementById("signupModal"));
  document.getElementById("signupForm").dataset.bookId = bookId;
  modal.show();
}

function borrowBookDirectly(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book || book.status === "Borrowed") {
    showToast("Book is not available!");
    return;
  }

  book.status = "Borrowed";
  const borrowDate = new Date();
  const dueDate = new Date(borrowDate);
  dueDate.setDate(borrowDate.getDate() + 7);

  borrowingHistory.push({
    bookId,
    userId: currentUser.id,
    borrowDate,
    dueDate,
  });

  saveData();
  renderCatalog();
  renderUserBooks();
  updateDashboard();
  showToast(`${book.title} successfully borrowed! Due date: ${dueDate.toLocaleDateString()}`);
}


// Return book
function returnBook(bookId, userId) {
  const book = books.find((b) => b.id === bookId);
  book.status = "Available";
  borrowingHistory = borrowingHistory.filter(
    (record) => !(record.bookId === bookId && record.userId === userId)
  );
  saveData();
  renderCatalog();
  renderUserBooks();
  updateDashboard();
  showToast(`${book.title} successfully returned!`);
}

// Toggle wishlist
function toggleWishlist(bookId) {
  wishlist = wishlist.includes(bookId)
    ? wishlist.filter((id) => id !== bookId)
    : [...wishlist, bookId];
  saveData();
  renderCatalog();
}

// Show toast notification
function showToast(message) {
  const toastContainer = document.getElementById("toastContainer");
  const toastId = `toast-${Date.now()}`;
  toastContainer.innerHTML += `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="me-auto">LibraRead</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body alert alert-success">${message}</div>
        </div>
    `;
  const toast = new bootstrap.Toast(document.getElementById(toastId), {
    delay: 3000,
  });
  toast.show();
}

// Handle admin access form submission
function handleAdminAccess(e) {
  e.preventDefault();
  const emailInput = document.getElementById("adminEmailInput");
  const email = emailInput.value.trim().toLowerCase();

  if (!validateEmail(email)) {
    showError(emailInput, "Please enter a valid email address");
    return;
  }

  if (email !== getAdminEmail().toLowerCase()) {
    showError(emailInput, "Invalid email, contact the admin");
    return;
  }

  // Clear any errors and hide the admin access modal
  clearError(emailInput);
  document.getElementById("adminAccessForm").reset();
  const adminModal = bootstrap.Modal.getInstance(document.getElementById("adminAccessModal"));
  adminModal.hide();

  // Show the dashboard modal
  updateDashboard();
  const dashboardModal = new bootstrap.Modal(document.getElementById("dashboardModal"));
  dashboardModal.show();
}

// Update dashboard modal
function updateDashboard() {
  const modalBody = document.getElementById("dashboardContent");
  modalBody.innerHTML = `
        <h4>Library Statistics</h4>
        <div class="row mb-4">
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body">
                        <h5>Total Books</h5>
                        <p id="totalBooks">${books.length}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body">
                        <h5>Borrowed Books</h5>
                        <p id="totalBorrowed">${books.filter(b => b.status === "Borrowed").length}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body">
                        <h5>Available Books</h5>
                        <p id="totalAvailable">${books.filter(b => b.status === "Available").length}</p>
                    </div>
                </div>
            </div>
        </div>
        <h4>Genre Distribution</h4>
        <canvas id="genreChart" height="200"></canvas>
        <h4 class="mt-4">Book Management</h4>
        <button class="btn btn-primary mb-3" onclick="openAddBookModal()">Add New Book</button>
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Genre</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody id="bookTableDashboard"></tbody>
        </table>
        <h4 class="mt-4">Borrowing History</h4>
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Borrower</th>
                    <th>Email</th>
                    <th>Borrowed Date</th>
                    <th>Due Date</th>
                </tr>
            </thead>
            <tbody id="historyTableDashboard"></tbody>
        </table>
    `;

  // Populate book table
  const bookTable = document.getElementById("bookTableDashboard");
  books.forEach(book => {
    const isBorrowed = borrowingHistory.some(record => record.bookId === book.id);
    bookTable.innerHTML += `
            <tr>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${book.genre}</td>
                <td>${book.status}</td>
                <td>
                    <button class="btn btn-sm btn-danger ${isBorrowed ? 'disabled' : ''}" 
                            onclick="deleteBook(${book.id})">Delete</button>
                </td>
            </tr>
        `;
  });

  // Populate borrowing history table
  const historyTable = document.getElementById("historyTableDashboard");
  borrowingHistory.forEach(record => {
    const book = books.find(b => b.id === record.bookId);
    const user = users.find(u => u.id === record.userId);
    historyTable.innerHTML += `
            <tr>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${new Date(record.borrowDate).toLocaleDateString()}</td>
                <td>${new Date(record.dueDate).toLocaleDateString()}</td>
            </tr>
        `;
  });
}

function openAddBookModal() {
  const modal = new bootstrap.Modal(document.getElementById("addBookModal"));
  modal.show();
}

function addBook(e) {
  e.preventDefault();
  const title = document.getElementById("bookTitle").value.trim();
  const author = document.getElementById("bookAuthor").value.trim();
  const genre = document.getElementById("bookGenre").value;
  const image = document.getElementById("bookImage").value.trim();

  if (!title || !author || !genre || !image) {
    showToast("All fields are required!");
    return;
  }

  const newBook = {
    id: generateId(),
    title,
    author,
    genre,
    image,
    status: "Available"
  };
  books.push(newBook);
  saveData();
  renderCatalog();
  updateDashboard();
  const modal = bootstrap.Modal.getInstance(document.getElementById("addBookModal"));
  modal.hide();
  document.getElementById("addBookForm").reset();
  showToast(`${title} added successfully!`);
}

function deleteBook(bookId) {
  if (borrowingHistory.some(record => record.bookId === bookId)) {
    showToast("Cannot delete a borrowed book!");
    return;
  }
  books = books.filter(b => b.id !== bookId);
  wishlist = wishlist.filter(id => id !== bookId);
  saveData();
  renderCatalog();
  updateDashboard();
  showToast("Book deleted successfully!");
}

// Export history as CSV
function exportHistoryAsCsv() {
  let csv = "Title,Author,User Name,User Email,Borrowed Date,Due Date\n";
  borrowingHistory.forEach((record) => {
    const book = books.find((b) => b.id === record.bookId);
    const user = users.find((u) => u.id === record.userId);
    csv += `"${book.title.replace(/"/g, '""')}","${book.author.replace(
      /"/g,
      '""'
    )}","${user.name.replace(/"/g, '""')}","${user.email.replace(
      /"/g,
      '""'
    )}",${new Date(record.borrowDate).toLocaleDateString()},${new Date(
      record.dueDate
    ).toLocaleDateString()}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "borrowing_history.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Reset storage
async function resetStorage() {
  if (!confirm("Are you sure you want to reset all data?")) return;

  try {
    const response = await fetch("data.json");
    if (!response.ok) throw new Error("Error fetching initial books");
    const data = await response.json();

    localStorage.clear();
    books = data.initialBooks;
    borrowingHistory = [];
    wishlist = [];
    users = [];

    saveData();
    renderCatalog();
    renderUserBooks();
    updateDashboard();
    showToast("Data has been reset to its initial state.");
  } catch (error) {
    console.error("Failed to reset data:", error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Theme toggle
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const icon = document.querySelector("#themeToggle i");
    icon.classList.toggle("fa-moon");
    icon.classList.toggle("fa-sun");
  });

  // Filters and search
  document.getElementById("searchInput")?.addEventListener("input", renderCatalog);
  document.getElementById("genreFilter")?.addEventListener("change", renderCatalog);
  document.getElementById("availabilityFilter")?.addEventListener("change", renderCatalog);

  // Export and reset
  document.getElementById("exportCsvBtn")?.addEventListener("click", exportHistoryAsCsv);
  document.getElementById("resetStorageBtn")?.addEventListener("click", resetStorage);

  // Signup and Login forms
  document.getElementById("signupForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("signupUsername").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const bookId = parseInt(e.target.dataset.bookId);

    const result = signupUser(username, email, password);
    if (!result.success) {
      showToast(result.message);
      return;
    }

    const modal = bootstrap.Modal.getInstance(document.getElementById("signupModal"));
    modal.hide();
    document.getElementById("signupForm").reset();
    showToast("Signup successful! Redirecting to login...");
    setTimeout(() => {
      const loginModal = new bootstrap.Modal(document.getElementById("loginModal"));
      loginModal.show();
      document.getElementById("loginForm").dataset.bookId = bookId;
    }, 2000);
  });

  document.getElementById("loginForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const bookId = parseInt(e.target.dataset.bookId);

    const result = loginUser(email, password);
    if (!result.success) {
      showToast(result.message);
      return;
    }

    updateNavbar();
    renderCatalog();
    const modal = bootstrap.Modal.getInstance(document.getElementById("loginModal"));
    modal.hide();
    document.getElementById("loginForm").reset();
    showToast(`Welcome, ${result.user.username}!`);
    if (bookId) borrowBookDirectly(bookId);
  });

  // Add book form
  document.getElementById("addBookForm")?.addEventListener("submit", addBook);

  // Dashboard modal - Show admin access modal first
  document.getElementById("dashboardLink")?.addEventListener("click", () => {
    const adminModal = new bootstrap.Modal(document.getElementById("adminAccessModal"));
    adminModal.show();
  });

  // Admin access form submission
  document.getElementById("adminAccessForm")?.addEventListener("submit", handleAdminAccess);

  // My Books link
  document.getElementById("myBooksLink")?.addEventListener("click", openMyBooksModal);
}

// Initialize application
lnitializeApp();
