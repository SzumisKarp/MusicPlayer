const audioPlayer = document.getElementById('audio-player');
const playButton = document.getElementById('play');
const pauseButton = document.getElementById('pause');
const nextButton = document.getElementById('next');
const prevButton = document.getElementById('prev');
const songTitle = document.getElementById('song-title');
const progressBar = document.getElementById('progress-bar');
const currentTimeDisplay = document.getElementById('current-time');
const durationDisplay = document.getElementById('duration');
const volumeBar = document.getElementById('volume-bar');
const volumeLevel = document.getElementById('volume-level');
const shuffleButton = document.getElementById('shuffle');
const repeatButton = document.getElementById('repeat');

const body = document.body;

// Lista utworów i indeks aktualnego
let songs = [];
let currentSongIndex = 0;

// Tryby odtwarzania
let isShuffle = false; // Losowe odtwarzanie
let isRepeat = false;  // Powtarzanie utworu

// Tablica z indeksami piosenek, które nie zostały jeszcze odtworzone w obecnym "cyklu" shuffle
let remainingShuffleIndices = [];

// Zapamiętujemy poprzedni utwór (aby cofnąć się o 1 w shuffle)
let previousSongIndex = null;

// Zapamiętujemy ten utwór, z którego się cofnęliśmy, aby wrócić do niego przy Next (tylko raz)
let restoreSongIndex = null;

// Flaga mówiąca, że aktualny utwór został osiągnięty przez cofnięcie
let cameFromPrev = false;

/* ==========================================
   FUNKCJE POMOCNICZE
   ========================================== */

// Przywraca / inicjalizuje ustawienia (ostatnio odtwarzany utwór + głośność)
function initPlayerSettings() {
  const savedIndex = parseInt(localStorage.getItem('lastSongIndex'), 10);
  const savedVolume = parseFloat(localStorage.getItem('lastVolume'));

  if (!isNaN(savedIndex)) {
    currentSongIndex = savedIndex;
  }
  if (!isNaN(savedVolume)) {
    audioPlayer.volume = savedVolume;
    volumeBar.value = savedVolume * 100;
    volumeLevel.textContent = volumeBar.value + '%';
  }
}

// Resetuje tablicę `remainingShuffleIndices`
function resetShuffleArray() {
  remainingShuffleIndices = songs.map((_, idx) => idx);
}

// Zwraca kolejny indeks w trybie shuffle (bez powtórek w danym cyklu)
function getNextShuffleIndex() {
  if (remainingShuffleIndices.length === 0) {
    resetShuffleArray();
    // Usuń bieżący indeks, by nie wylosować tej samej piosenki
    const pos = remainingShuffleIndices.indexOf(currentSongIndex);
    if (pos !== -1) {
      remainingShuffleIndices.splice(pos, 1);
    }
  }
  const randomPos = Math.floor(Math.random() * remainingShuffleIndices.length);
  const nextIndex = remainingShuffleIndices.splice(randomPos, 1)[0];
  return nextIndex;
}

// Ładuje piosenkę o podanym indeksie
function loadSong(index) {
  audioPlayer.src = songs[index];
  songTitle.textContent = "🎵 " + songs[index].split('/').pop().replace('.mp3', '');

  // Po wczytaniu metadanych (m.in. długości)
  audioPlayer.addEventListener('loadedmetadata', () => {
    progressBar.max = audioPlayer.duration;
    durationDisplay.textContent = formatTime(audioPlayer.duration);
  });

  localStorage.setItem('lastSongIndex', index);

  // Jeśli nie jest pauzowany, kontynuuj odtwarzanie
  if (!audioPlayer.paused) {
    audioPlayer.play();
    body.classList.add('dark-mode', 'pulsing');
  }
}

// Formatuje sekundy do "min:sek"
function formatTime(time) {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/* ==========================================
   GŁÓWNY KOD
   ========================================== */

// Wczytanie listy piosenek
window.electronAPI.getMusicFiles().then(files => {
  songs = files.map(file => `assets/music/${file}`);
  if (songs.length > 0) {
    initPlayerSettings();
    loadSong(currentSongIndex);
  }
});

// PLAY
playButton.addEventListener('click', () => {
  // Aktywny staje się przycisk Play
  playButton.classList.add('active');
  // Wyłącz aktywność Pause
  pauseButton.classList.remove('active');

  if (audioPlayer.paused) {
    audioPlayer.play();
    body.classList.add('dark-mode', 'pulsing');
  }
});

// PAUSE
pauseButton.addEventListener('click', () => {
  // Aktywny staje się przycisk Pause
  pauseButton.classList.add('active');
  // Wyłącz aktywność Play
  playButton.classList.remove('active');

  audioPlayer.pause();
  body.classList.remove('pulsing');
});

// NEXT
nextButton.addEventListener('click', () => {
  // Dodaj chwilową animację "kliknięcia" (opcjonalnie)
  nextButton.classList.add('inverted');
  setTimeout(() => {
    nextButton.classList.remove('inverted');
  }, 200);

  if (songs.length === 0) return;

  // Jeśli było pauzowane, to właściwie przechodzimy do "graj"
  if (audioPlayer.paused) {
    // Ustaw, że "Play" jest aktywny, "Pause" - nie
    playButton.classList.add('active');
    pauseButton.classList.remove('active');
  }

  if (isShuffle) {
    if (cameFromPrev && restoreSongIndex != null) {
      previousSongIndex = currentSongIndex;
      currentSongIndex = restoreSongIndex;
      restoreSongIndex = null;
      cameFromPrev = false;
    } else {
      if (remainingShuffleIndices.length === 0) {
        resetShuffleArray();
        const pos = remainingShuffleIndices.indexOf(currentSongIndex);
        if (pos !== -1) {
          remainingShuffleIndices.splice(pos, 1);
        }
      }
      previousSongIndex = currentSongIndex;
      currentSongIndex = getNextShuffleIndex();
      cameFromPrev = false;
      restoreSongIndex = null;
    }
  } else {
    // Tryb normalny
    previousSongIndex = currentSongIndex;
    currentSongIndex = (currentSongIndex + 1) % songs.length;
  }

  loadSong(currentSongIndex);
  audioPlayer.play();
});

// PREV
prevButton.addEventListener('click', () => {
  // Animacja "mignięcia"
  prevButton.classList.add('inverted');
  setTimeout(() => {
    prevButton.classList.remove('inverted');
  }, 200);

  if (songs.length === 0) return;

  // Jeśli było pauzowane, to przechodzimy do stanu "Play" = aktywny
  if (audioPlayer.paused) {
    playButton.classList.add('active');
    pauseButton.classList.remove('active');
  }

  if (isShuffle) {
    if (previousSongIndex !== null) {
      // Cofamy się do poprzedniego
      restoreSongIndex = currentSongIndex;
      currentSongIndex = previousSongIndex;
      previousSongIndex = null;
      cameFromPrev = true;
    } else {
      // Drugi raz Prev - losujemy
      restoreSongIndex = currentSongIndex;
      currentSongIndex = getNextShuffleIndex();
      cameFromPrev = true;
    }
  } else {
    // Tryb normalny
    let old = currentSongIndex;
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    previousSongIndex = old;
  }

  loadSong(currentSongIndex);
  audioPlayer.play();
});

// Aktualizacja paska postępu
audioPlayer.addEventListener('timeupdate', () => {
  if (!isNaN(audioPlayer.duration)) {
    progressBar.max = audioPlayer.duration;
    progressBar.value = audioPlayer.currentTime;
    currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
    durationDisplay.textContent = formatTime(audioPlayer.duration);
  }
});

// Zakończenie utworu
audioPlayer.addEventListener('ended', () => {
  body.classList.remove('dark-mode', 'pulsing');
  // Jeśli jest repeat
  if (isRepeat) {
    loadSong(currentSongIndex);
  } else if (isShuffle) {
    if (cameFromPrev) {
      cameFromPrev = false;
      previousSongIndex = currentSongIndex;
      currentSongIndex = getNextShuffleIndex();
      restoreSongIndex = null;
      loadSong(currentSongIndex);
    } else {
      if (remainingShuffleIndices.length === 0) {
        resetShuffleArray();
        const pos = remainingShuffleIndices.indexOf(currentSongIndex);
        if (pos !== -1) {
          remainingShuffleIndices.splice(pos, 1);
        }
      }
      previousSongIndex = currentSongIndex;
      currentSongIndex = getNextShuffleIndex();
      loadSong(currentSongIndex);
    }
  } else {
    // Tryb normalny
    previousSongIndex = currentSongIndex;
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    loadSong(currentSongIndex);
  }

  audioPlayer.play();

  // Ustaw aktywny przycisk "Play", bo znów gra
  playButton.classList.add('active');
  pauseButton.classList.remove('active');
});

// Ręczne przesuwanie paska
progressBar.addEventListener('input', () => {
  audioPlayer.currentTime = progressBar.value;
});

// Obsługa zmiany głośności
volumeBar.addEventListener('input', () => {
  audioPlayer.volume = volumeBar.value / 100;
  volumeLevel.textContent = `${volumeBar.value}%`;
  localStorage.setItem('lastVolume', audioPlayer.volume);
});

// Włączanie/wyłączanie shuffle
shuffleButton.addEventListener('click', () => {
  // Mignięcie
  shuffleButton.classList.add('inverted');
  setTimeout(() => {
    shuffleButton.classList.remove('inverted');
  }, 200);

  isShuffle = !isShuffle;
  shuffleButton.classList.toggle('active', isShuffle);

  if (isShuffle) {
    // Wyłącz repeat
    isRepeat = false;
    repeatButton.classList.remove('active');

    resetShuffleArray();
    const pos = remainingShuffleIndices.indexOf(currentSongIndex);
    if (pos !== -1) {
      remainingShuffleIndices.splice(pos, 1);
    }
    cameFromPrev = false;
    previousSongIndex = null;
    restoreSongIndex = null;
  } else {
    remainingShuffleIndices = [];
  }
});

// Włączanie/wyłączanie repeat
repeatButton.addEventListener('click', () => {
  // Mignięcie
  repeatButton.classList.add('inverted');
  setTimeout(() => {
    repeatButton.classList.remove('inverted');
  }, 200);

  isRepeat = !isRepeat;
  repeatButton.classList.toggle('active', isRepeat);

  if (isRepeat) {
    // Wyłącz shuffle
    isShuffle = false;
    shuffleButton.classList.remove('active');
    remainingShuffleIndices = [];
    previousSongIndex = null;
    restoreSongIndex = null;
    cameFromPrev = false;
  }
});
