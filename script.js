// Data Storage
let books = JSON.parse(localStorage.getItem("books")) || [];
let borrowingHistory = JSON.parse(localStorage.getItem("borrowingHistory")) || [];
let wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
let users = JSON.parse(localStorage.getItem("users")) || [];
let currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;

// Retrieves admin email from localStorage or sets a default
function getAdminEmail() {
  let adminEmail = localStorage.getItem("SeyiEmail");
  if (!adminEmail) {
    adminEmail = "seyii@example.com";
    localStorage.setItem("SeyiEmail", adminEmail);
  }
  return adminEmail;
}
// Sets a new admin email if valid
function setAdminEmail(email) {
  if (!validateEmail(email)) {
    console.error("Invalid email format");
    return false;
  }
  localStorage.setItem("adminEmail", email.trim().toLowerCase());
  console.log(`Admin email set to: ${email}`);
  return true;
}
// Initializes the app by loading books, setting up listeners, and rendering UI
async function initializeApp() {
  await loadInitialBooks();
  setupEventListeners();
  renderCatalog();
  updateNavbar();
}

async function loadInitialBooks() {
  try {
    const response = await fetch("data.json");
    if (!response.ok) throw new Error("Failed to fetch initial books");
    const data = await response.json();
    if (books.length === 0) {
      books = data.initialBooks.map(book => ({
        ...book,
        id: Number(book.id)
      }));
      saveData();
    }
  } catch (error) {
    console.error("Failed to load initial books:", error);
  }
}

function saveData() {
  localStorage.setItem("books", JSON.stringify(books));
  localStorage.setItem("borrowingHistory", JSON.stringify(borrowingHistory));
  localStorage.setItem("wishlist", JSON.stringify(wishlist));
  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("currentUser", JSON.stringify(currentUser));
}

function generateId() {
  return Date.now() + Math.random().toString(36).substr(2, 9);
}
// Generates a new sequential book ID
function generateNewBookId() {
  const maxId = books.length > 0 ? Math.max(...books.map(book => Number(book.id))) : 0;
  return maxId + 1;
}
// Renders the book catalog with search and filter functionality
function renderCatalog() {
  const catalog = document.getElementById("bookCatalog");
  catalog.innerHTML = "";
  const search = document.getElementById("searchInput").value.toLowerCase()  ;
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
                        <img src="${book.cover}" class="card-img-top" alt="${book.title}">
                        <div class="card-body">
                            <h5 class="card-title">${book.title}</h5>
                            <p class="card-text">Author: ${book.author}</p>
                            <p class="card-text">Genre: ${book.genre}</p>
                            <p class="card-text">Status: ${book.status}</p>
                            <button class="btn btn-sm btn-primary ${book.status === "Borrowed" ? "disabled" : ""}" 
                                    onclick="openBorrowModal(${book.id})">
                                <i class="fas fa-book"></i> Borrow
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" 
                                    onclick="toggleWishlist(${book.id})">
                                <i class="fas fa-heart ${isWishlisted ? "text-danger" : ""}"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
    });
}
// Opens a modal to display the user's borrowed books
function openMyBooksModal() {
  if (!currentUser) {
    showToast("Please login to view your borrowed books.");
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
// Switches from signup modal to login modal, preserving book ID
function switchToLoginModal() {
  const signupModal = bootstrap.Modal.getInstance(document.getElementById("signupModal"));
  const bookId = document.getElementById("signupForm").dataset.bookId;
  signupModal.hide();
  const loginModal = new bootstrap.Modal(document.getElementById("loginModal"));
  document.getElementById("loginForm").dataset.bookId = bookId;
  loginModal.show();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}
// Registers a new user if inputs are valid
function signupUser(username, email, password) {
  if (!validateName(username).isValid) return { success: false, message: "Invalid username" };
  if (!validateEmail(email)) return { success: false, message: "Invalid email" };
  if (!validatePassword(password)) return { success: false, message: "Password must be at least 6 characters" };
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, message: "User with this email already exist" };
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
  const confirmation = confirm("Are you sure you want to logout")
  if (confirmation) {
    currentUser = null;
    saveData();
    updateNavbar();
    renderCatalog();
    // renderUserBooks();
    showToast("Logged out successfully!");
  } else {
    console.log("Logout canceled by the user.")
  }
}
// Updates the navigation bar based on user login status
function updateNavbar() {
  const navItems = document.querySelector(".navbar-nav.ms-auto");
  if (!navItems) return;

  navItems.querySelectorAll(".nav-item.dynamic").forEach(item => item.remove());

  if (currentUser) {
    const welcomeItem = document.createElement("li");
    welcomeItem.className = "nav-item dynamic";
    welcomeItem.innerHTML = `<span class="nav-link">Welcome, ${currentUser.username}</span>`;
    navItems.appendChild(welcomeItem);

    const logoutItem = document.createElement("li");
    logoutItem.className = "nav-item dynamic";
    logoutItem.id = "logoutBtn";
    logoutItem.innerHTML = `<button class="btn btn-danger nav-link" onclick="logoutUser()">Logout</button>`;
    navItems.appendChild(logoutItem);
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

function showError(input, message) {
  input.classList.add("is-invalid");
  input.nextElementSibling.textContent = message;
}

function clearError(input) {
  input.classList.remove("is-invalid");
  input.nextElementSibling.textContent = "";
}

function openBorrowModal(bookId) {
  bookId = Number(bookId);
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
// Borrows a book directly for the logged-in user
function borrowBookDirectly(bookId) {
  bookId = Number(bookId);
  const book = books.find(b => b.id === bookId);
  if (!book || book.status === "Borrowed") {
    return;
  }
  showToast(`${book.title} as been borrowed successfully`)

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
  // renderUserBooks();
  updateDashboard();
}
// Returns a borrowed book and updates records
function returnBook(bookId, userId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;
  book.status = "Available";

  borrowingHistory = borrowingHistory.filter(
    record => !(record.bookId === bookId && record.userId === userId)
  );
  saveData();
  renderCatalog();

  const modalBody = document.getElementById("myBooksContent");
  const modal = bootstrap.Modal.getInstance(document.getElementById("myBooksModal"));
  if (modalBody) {
    modalBody.innerHTML = "";

    const userRecords = borrowingHistory.filter(record => record.userId === currentUser.id);
    if (userRecords.length === 0) {
      modalBody.innerHTML = "<p class='text-danger'>You haven't borrowed any books yet.</p>";
    } else {
      userRecords.forEach(record => {
        const book = books.find(b => b.id === record.bookId);
        if (book) {
          modalBody.innerHTML += `
            <div class="card mb-3">
              <div class="card-body">
                <h5 class="card-title">${book.title}</h5>
                <p class="card-text">Author: ${book.author}</p>
                <p class="card-text">Borrowed: ${new Date(record.borrowDate).toLocaleDateString()}</p>
                <p class="card-text">Due: ${new Date(record.dueDate).toLocaleDateString()}</p>
                <button class="btn btn-sm btn-success" 
                        onclick="returnBook(${record.bookId}, '${record.userId}')"
                        id="return-btn-${record.bookId}">Return</button>
              </div>
            </div>
          `;
        }
      });
    }
  }

  updateDashboard();
  showToast(`${book.title} returned successfully!`);
}
// Toggles a book in/out of the wishlist
function toggleWishlist(bookId) {
  wishlist = wishlist.includes(bookId) ? wishlist.filter((id) => id !== bookId) : [...wishlist, bookId];
  saveData();
  renderCatalog();
}
// Displays a toast notification
function showToast(message, variant = "success") {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    console.error("Toast container not found in the DOM");
    return;
  }

  const toastId = `toast-${Date.now()}`;
  const validVariants = ["success", "danger", "warning", "info", "primary", "secondary", "dark", "light"];

  // Sanitize and fallback if variant is not recognized
  const safeVariant = validVariants.includes(variant) ? variant : "secondary";

  toastContainer.innerHTML += `
    <div id="${toastId}" class="toast align-items-center text-white bg-${safeVariant} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, {
    delay: 1000,
  });
  toast.show();
}
// Handles admin access authentication
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

  clearError(emailInput);
  document.getElementById("adminAccessForm").reset();
  const adminModal = bootstrap.Modal.getInstance(document.getElementById("adminAccessModal"));
  adminModal.hide();

  updateDashboard();
  const dashboardModal = new bootstrap.Modal(document.getElementById("dashboardModal"));
  dashboardModal.show();
}
// Updates the admin dashboard with library statistics and management tools
function updateDashboard() {
  const modalBody = document.getElementById("dashboardContent");
  modalBody.innerHTML = `
    <h4>Library Statistics</h4>
    <div class="row mb-4">
      <div class="col-md-4 mb-2">
        <div class="card">
          <div class="card-body">
            <h5>Total Books</h5>
            <p id="totalBooks">${books.length}</p>
          </div>
        </div>
      </div>
      <div class="col-md-4 mb-2">
        <div class="card">
          <div class="card-body">
            <h5>Borrowed Books</h5>
            <p id="totalBorrowed">${books.filter(b => b.status === "Borrowed").length}</p>
          </div>
        </div>
      </div>
      <div class="col-md-4 mb-2">
        <div class="card">
          <div class="card-body">
            <h5>Available Books</h5>
            <p id="totalAvailable">${books.filter(b => b.status === "Available").length}</p>
          </div>
        </div>
      </div>
    </div>
    <h4>Genre Distribution</h4>
    <canvas id="genreChart" style="max-height: 300px;"></canvas>
    <h4 class="mt-4">Book Management</h4>
    <button class="btn btn-primary mb-3" onclick="openAddBookModal()">Add New Book</button>
    <div class="table-responsive">
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
    </div>
    <h4 class="mt-4">Borrowing History</h4>
    <div class="table-responsive">
      <table class="table table-striped">
        <thead class="bg-primary text-white">
          <tr>
            <th>Borrower</th>
            <th>Email</th>
            <th>Borrowed Books</th>
          </tr>
        </thead>
        <tbody id="historyTableDashboard"></tbody>
      </table>
    </div>
    
  `;

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
  // organizes the borrowing history by users.

  const historyTable = document.getElementById("historyTableDashboard");
  const userBorrowingMap = borrowingHistory.reduce((acc, record) => {
    if (!acc[record.userId]) {
      const user = users.find(u => u.id === record.userId);
      acc[record.userId] = { user, books: [] };
    }
    const book = books.find(b => b.id === record.bookId);
    acc[record.userId].books.push({
      book,
      borrowDate: record.borrowDate,
      dueDate: record.dueDate
    });
    return acc;
  }, {});

  Object.values(userBorrowingMap).forEach(({ user, books }) => {
    let booksListHtml = '<ul>';
    books.forEach(({ book, borrowDate, dueDate }) => {
      booksListHtml += `
        <li>
          <strong class="text-dark">${book.title}</strong><br>
          <span class="text-muted">Author: ${book.author}</span><br>
          <span class="text-muted">Borrowed: ${new Date(borrowDate).toLocaleDateString()}</span><br>
          <span class="text-muted">Due: ${new Date(dueDate).toLocaleDateString()}</span>
        </li>
      `;
    });
    booksListHtml += '</ul>';

    historyTable.innerHTML += `
      <tr>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td class="bg-light">${booksListHtml}</td>
      </tr>
    `;
  });
  // counting how many books belong to each genre in a list
  const genreCounts = books.reduce((acc, book) => {
    acc[book.genre] = (acc[book.genre] || 0) + 1;
    return acc;
  }, {});

  const ctx = document.getElementById("genreChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(genreCounts),
      datasets: [
        {
          label: "Number of Books",
          data: Object.values(genreCounts),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
          ],
          borderColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Number of Books",
          },
        },
        x: {
          title: {
            display: true,
            text: "Genre",
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}


function openAddBookModal() {
  const modal = new bootstrap.Modal(document.getElementById("addBookModal"));
  modal.show();
}

function openAddBookModal() {
  const modal = new bootstrap.Modal(document.getElementById("addBookModal"));
  modal.show();
}
// Adds a new book to the library
function addBook(e) {
  e.preventDefault();
  const title = document.getElementById("bookTitle").value.trim();
  const author = document.getElementById("bookAuthor").value.trim();
  const genre = document.getElementById("bookGenre").value;
  const cover = document.getElementById("bookImage").value.trim();

  if (!title || !author || !genre || !cover) {
    showToast("All fields are required!");
    return;
  }

  const newBook = {
    id: generateNewBookId(),
    title,
    author,
    genre,
    cover,
    status: "Available"
  };
  books.push(newBook);
  saveData();
  renderCatalog();
  updateDashboard();
  const modal = bootstrap.Modal.getInstance(document.getElementById("addBookModal"));
  modal.hide();
  document.getElementById("addNewBook").reset();
  showToast(`${title} added successfully!`);
}
// Deletes a book if not borrowed, after confirmation
function deleteBook(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;

  if (borrowingHistory.some(record => record.bookId === bookId)) {
    showToast("Cannot delete a borrowed book!");
    return;
  }

  const confirmation = confirm(`Are you sure you want to delete "${book.title}"?`);
  if (!confirmation) {
    showToast("Book deletion canceled.");
    return;
  }

  books = books.filter(b => b.id !== bookId);
  saveData();
  renderCatalog();
  updateDashboard();
  showToast("Book deleted successfully!");
}
// Exports borrowing history as a CSV file
function exportHistoryAsCsv() {
  let csv = "Title,Author,User Name,User Email,Borrowed Date,Due Date\n";
  borrowingHistory.forEach((record) => {
    const book = books.find((b) => b.id === record.bookId);
    const user = users.find((u) => u.id === record.userId);
    csv += `"${book.title.replace(/"/g, '""')}","${book.author.replace(
      /"/g,
      '""'
    )}","${user.username.replace(/"/g, '""')}","${user.email.replace(
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
// Sets up event listeners for UI interactions
function setupEventListeners() {
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const icon = document.querySelector("#themeToggle i");
    icon.classList.toggle("fa-moon");
    icon.classList.toggle("fa-sun");
  });

  document.getElementById("searchInput")?.addEventListener("input", renderCatalog);
  document.getElementById("genreFilter")?.addEventListener("change", renderCatalog);
  document.getElementById("availabilityFilter")?.addEventListener("change", renderCatalog);

  document.getElementById("exportCsvBtn")?.addEventListener("click", exportHistoryAsCsv);


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
    const bookId = Number(e.target.dataset.bookId);

    const result = loginUser(email, password);
    if (!result.success) {
      showToast(result.message, "danger");
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

  document.getElementById("addNewBook")?.addEventListener("submit", addBook);

  document.getElementById("dashboardLink")?.addEventListener("click", () => {
    const adminModal = new bootstrap.Modal(document.getElementById("adminAccessModal"));
    adminModal.show();
  });

  document.getElementById("adminAccessForm")?.addEventListener("submit", handleAdminAccess);

  document.getElementById("myBooksLink")?.addEventListener("click", openMyBooksModal);
}
// Initializes app state on page load
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("currentUser") && !currentUser) {
    currentUser = JSON.parse(localStorage.getItem("currentUser"));
  }
  updateNavbar();
});

initializeApp();