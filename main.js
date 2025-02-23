const { app, BrowserWindow, ipcMain, Tray, Menu, dialog } = require('electron');
 // --- NOWE: Tray, Menu ---
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray = null;         // --- NOWE: zmienna na obiekt Traya ---
let isQuitting = false;  // --- NOWE: flaga, czy user zamyka aplikację naprawdę ---

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html');

  // --- NOWE: kiedy użytkownik kliknie X, chowaj okno zamiast zamykać aplikację ---
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// --- NOWE: funkcja tworząca ikonę w tray i menu do niej ---
function createTray() {
  // Ikona do traya (wstaw poprawną ścieżkę do swojej ikonki)
  tray = new Tray(path.join(__dirname, 'assets', 'icons', 'trayicon.png'));

  // Menu kontekstowe po kliknięciu prawym na ikonę
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Pokaż okno',
      click: () => {
        mainWindow.show();
      },
    },
    {
      label: 'Zakończ',
      click: () => {
        isQuitting = true; 
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Odtwarzacz Muzyki'); // tekst podpowiedzi
  tray.setContextMenu(contextMenu);

  // (Opcjonalnie) reakcja na kliknięcie lewym przyciskiem
  tray.on('click', () => {
    // np. pokaż/ukryj okno
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray(); // --- NOWE: tworzenie ikony w tray
  
  // Na macOS, gdy wszystkie okna zamknięte, aplikacja bywa "aktywowana" z paska
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

// Handler do pobierania plików .mp3
ipcMain.handle('get-music-files', async () => {
  const musicFolder = path.join(__dirname, 'assets/music');
  return fs.readdirSync(musicFolder).filter((file) => file.endsWith('.mp3'));
});

// Jeśli użytkownik faktycznie chce wyjść (np. z paska w tray → Zakończ)
app.on('window-all-closed', () => {
  // na macOS z reguły nie zamyka się app (możesz to zostawić lub usunąć)
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('add-music-files', async (event) => {
  // Otwórz okno dialogowe, by wybrać jeden lub więcej plików
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Wybierz pliki MP3 do dodania',
    filters: [{ name: 'Audio Files', extensions: ['mp3'] }],
    properties: ['openFile', 'multiSelections']
  });

  // Jeśli user anulował wybór - nie rób nic
  if (canceled || filePaths.length === 0) {
    return { added: false };
  }

  // Skopiuj wybrane pliki do folderu "assets/music"
  const musicFolder = path.join(__dirname, 'assets/music');

  let addedCount = 0;
  for (const filePath of filePaths) {
    const baseName = path.basename(filePath); // nazwa pliku.mp3
    const destPath = path.join(musicFolder, baseName);

    try {
      // Możesz wybrać fs.copyFileSync lub fs.renameSync.
      // rename przeniesie plik - tu raczej wolimy kopiować:
      fs.copyFileSync(filePath, destPath);

      addedCount++;
    } catch (error) {
      console.error('Nie udało się skopiować pliku', filePath, error);
    }
  }

  // Zwróć do renderera info, czy dodano przynajmniej jeden plik
  return { added: (addedCount > 0) };
});
