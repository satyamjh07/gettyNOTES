// Declare notes as a global variable
let notes = [];
let currentNoteIndex = -1;

const noteList = document.getElementById("note-list");
const noteDetails = document.getElementById("note-details");
const noteEditor = document.querySelector(".note-editor");

// Function to initialize IndexedDB
async function initializeDB() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("noteDB", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore("notes", { keyPath: "id", autoIncrement: true });
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Function to save the notes to IndexedDB
async function saveNotesToIndexedDB() {
  const db = await initializeDB();
  const transaction = db.transaction(["notes"], "readwrite");
  const store = transaction.objectStore("notes");

  notes.forEach((note) => {
    store.put(note);
  });
}

// Function to get notes from IndexedDB
async function getNotesFromIndexedDB() {
  const db = await initializeDB();
  const transaction = db.transaction(["notes"], "readonly");
  const store = transaction.objectStore("notes");
  const notes = [];

  return new Promise((resolve) => {
    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        notes.push(cursor.value);
        cursor.continue();
      } else {
        resolve(notes);
      }
    };
  });
}

// Function to render notes with date-time
function renderNotes() {
  noteList.innerHTML = "";
  notes.forEach((note, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${note.title}</span>
      <button class="edit-btn" onclick="editNote(${index})">&#9998;</button>
      <button class="delete-btn" onclick="deleteNote(${index})">&#10006;</button>
    `;
    li.onclick = () => showNoteDetails(note);
    noteList.appendChild(li);

    // Add timestamp for the note
    const timestamp = document.createElement("span");
    timestamp.textContent = formatDateTime(note.timestamp);
    li.appendChild(timestamp);
  });
}

// Function to format date and time
function formatDateTime(timestamp) {
  if (timestamp) {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    return new Date(timestamp).toLocaleString(undefined, options);
  } else {
    return ""; // Return an empty string if the timestamp is null
  }
}

// Function to add a new note
function addNote() {
  noteEditor.style.display = "block";
  document.getElementById("note-title").value = "";
  document.getElementById("note-description").value = "";
  document.getElementById("save-btn").innerText = "Save";
  document.getElementById("save-btn").onclick = saveNote;
  noteDetails.style.display = "none";
}

// Function to save the current note
async function saveNote() {
  const title = document.getElementById("note-title").value;
  const description = document.getElementById("note-description").value;

  if (title && description) {
    const note = { title, description };

    // Set the timestamp for a new note or update the timestamp for an existing note
    if (currentNoteIndex === -1) {
      note.timestamp = new Date().getTime(); // Set timestamp for a new note

      const db = await initializeDB();
      const transaction = db.transaction(["notes"], "readwrite");
      const store = transaction.objectStore("notes");

      const request = store.add(note);

      request.onsuccess = (event) => {
        showAlert("Note added successfully!", "success");
        note.id = event.target.result; // Save the auto-incremented id in the note object
        notes.push(note);
        saveNotesToIndexedDB(); // Save the updated notes array to IndexedDB
        renderNotes(); // Render the updated notes list
      };

      request.onerror = (event) => {
        console.error("Error adding note:", event.target.error);
        showAlert("check console for more details", "error")
      };
    } else {
        notes[currentNoteIndex].title = title;
        notes[currentNoteIndex].description = description;
        notes[currentNoteIndex].timestamp = new Date().getTime(); // Update timestamp for an existing note
        currentNoteIndex = -1; // Reset currentNoteIndex after updating
  
        const db = await initializeDB();
        const transaction = db.transaction(["notes"], "readwrite");
        const store = transaction.objectStore("notes");
  
        const updateRequest = store.put(notes[currentNoteIndex]);
  
        updateRequest.onsuccess = (event) => {
          showAlert("Note updated successfully!", "success");
        };
  
        updateRequest.onerror = (event) => {
          console.error("Error updating note:", event.target.error);
          showAlert("check console for more details", "error")
        };
    }

    noteEditor.style.display = "none";
  }
}

// Function to edit a note
function editNote(index) {
  const note = notes[index];
  document.getElementById("note-title").value = note.title;
  document.getElementById("note-description").value = note.description;
  noteEditor.style.display = "block";
  document.getElementById("save-btn").innerText = "Update";
  document.getElementById("save-btn").onclick = () => updateNote(index);
}

// Function to update a note
async function updateNote(index) {
  const title = document.getElementById("note-title").value;
  const description = document.getElementById("note-description").value;

  if (title && description) {
    notes[index].title = title;
    notes[index].description = description;
    notes[index].timestamp = new Date().getTime(); // Update timestamp for an existing note

    const db = await initializeDB();
    const transaction = db.transaction(["notes"], "readwrite");
    const store = transaction.objectStore("notes");

    const updateRequest = store.put(notes[index]);

    updateRequest.onsuccess = (event) => {
      showAlert("Note updated successfully!", "success");
      saveNotesToIndexedDB(); // Save the updated notes array to IndexedDB
      renderNotes(); // Render the updated notes list
      noteEditor.style.display = "none";
    };

    updateRequest.onerror = (event) => {
      console.error("Error updating note:", event.target.error);
      showAlert("check console for more details", "error")
    };
  }
}

// Function to delete a note
async function deleteNote(index) {
  // Ask the user to confirm before deleting the note
  const confirmDelete = confirm("Are you sure you want to delete this note?");
  if (confirmDelete) {
    const db = await initializeDB();
    const transaction = db.transaction(["notes"], "readwrite");
    const store = transaction.objectStore("notes");

    const deleteRequest = store.delete(notes[index].id);

    deleteRequest.onsuccess = (event) => {
      showAlert("Note deleted successfully!", "error");
      notes.splice(index, 1);
      saveNotesToIndexedDB(); // Save the updated notes array to IndexedDB
      renderNotes(); // Render the updated notes list
      noteDetails.innerHTML = ""; // Clear the note details when a note is deleted
      noteEditor.style.display = "none";
    };

    deleteRequest.onerror = (event) => {
      console.error("Error deleting note:", event.target.error);
      showAlert("check console for more details", "error")
    };
  }
}

// Function to show note details when a title is clicked
function showNoteDetails(note) {
  noteDetails.innerHTML = `
      <h3>${note.title}</h3>
      <p>${note.description}</p>
    `;
  noteDetails.style.display = "block";
}
// Function to export notes to .txt file
function exportNotes() {
    const filename = "notes_export.txt";
    const data = notes.reduce((acc, note) => `${acc}\nTitle: ${note.title}\nDescription: ${note.description}\n`, "");
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    showAlert("Note Exported Successfully", "success")
  }
  
  // Function to import notes from .txt file
  function importNotes(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async function () {
      const importedNotes = [];
      const lines = reader.result.split("\n");
      let currentNote = {};
  
      for (const line of lines) {
        if (line.startsWith("Title:")) {
          currentNote.title = line.slice("Title:".length).trim();
        } else if (line.startsWith("Description:")) {
          currentNote.description = line.slice("Description:".length).trim();
        } else if (line.trim() === "") {
          if (currentNote.title && currentNote.description) {
            importedNotes.push({ ...currentNote });
          }
          currentNote = {};
        }
      }
  
      if (importedNotes.length > 0) {
        notes = importedNotes;
        await saveNotesToIndexedDB();
        renderNotes();
        showAlert("Notes imported successfully!", "success");
      } else {
        showAlert("Invalid file format. Please provide a valid .txt file.", "error");
      }
    };
    reader.readAsText(file);
  }
  // Function to cancel the note editor
function cancelNote() {
    noteEditor.style.display = 'none';
    showAlert("Note-Editor Cancelled", "error")
  }

  const togglemode=()=>{
    const btn = document.getElementById("toggle-mode");
    if(btn.innerHTML === "Dark Mode"){
        btn.innerHTML = "Light Mode";
        document.documentElement.style.setProperty("--primary-color", "#000C66");
        document.documentElement.style.setProperty("--secondary-color", "#FA26A0");
        document.documentElement.style.setProperty("--background-color", "#050A30");
        document.documentElement.style.setProperty("--note-background-color", "cyan");
        document.documentElement.style.setProperty("--note-hover-background-color", "black");
        showAlert("Welcome To Dark Mode", "dark");
    }
    else{
        btn.innerHTML = "Dark Mode";
        document.documentElement.style.setProperty("--primary-color", "#007bff");
        document.documentElement.style.setProperty("--secondary-color", "#0056b3");
        document.documentElement.style.setProperty("--background-color", "#f0f0f0");
        document.documentElement.style.setProperty("--note-background-color", "#c4bebe");
        document.documentElement.style.setProperty("--note-hover-background-color", "#e9c0c0");
        showAlert("Welcome To Light Mode", "success");
    }
  }

  function showAlert(message, type) {
    const customAlert = document.getElementById("custom-alert");
    const customAlertMessage = document.getElementById("custom-alert-message");

    customAlertMessage.innerText = message;

    if (type === "success") {
      customAlert.style.backgroundColor = "#28a745";
    } else if (type === "error") {
      customAlert.style.backgroundColor = "#dc3545";
    } else if (type === "dark") {
      customAlert.style.backgroundColor = "black";
    }

    customAlert.classList.add("show");

    setTimeout(() => {
      customAlert.classList.remove("show");
    }, 3000);
  }
  // Initial setup
  renderNotes();