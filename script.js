const slides = [...document.querySelectorAll('.slide')];
const nextButton = document.querySelector('#next');
const growingNumber = document.querySelector('#growing-number');
let activeIndex = -1;
let growthTimer = null;
let shatterTimer = null;
let explosionTimer = null;
let zStretchTimer = null;
let physicsFrame = null;
let fragments = [];
let tiltX = 0;
let tiltY = 0;
let motionControlsReady = false;
let typewriterTimers = [];

function enableMotionControls() {
  if (motionControlsReady || !('DeviceOrientationEvent' in window)) return;
  motionControlsReady = true;

  const addOrientationListener = () => {
    window.addEventListener('deviceorientation', (event) => {
      tiltX = Math.max(-1, Math.min(1, (event.gamma || 0) / 35));
      tiltY = Math.max(-1, Math.min(1, (event.beta || 0) / 45));
      document.documentElement.style.setProperty('--tilt-x', tiltX);
      document.documentElement.style.setProperty('--tilt-y', tiltY);
    });
  };

  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then((permission) => {
      if (permission === 'granted') addOrientationListener();
    }).catch(() => {});
  } else {
    addOrientationListener();
  }
}

function resetExplosion() {
  if (explosionTimer !== null) window.clearTimeout(explosionTimer);
  explosionTimer = null;

  const explosionBackdrop = document.querySelector('.explosion-backdrop');
  const explosionImage = explosionBackdrop?.querySelector('img');
  const followup = document.querySelector('.explosion-followup');
  if (explosionBackdrop) {
    explosionBackdrop.style.visibility = 'hidden';
    explosionBackdrop.style.opacity = '0';
  }
  if (explosionImage) explosionImage.removeAttribute('src');
  if (followup) followup.style.opacity = '0';
}

function startExplosion() {
  const explosionBackdrop = document.querySelector('.explosion-backdrop');
  const explosionImage = explosionBackdrop?.querySelector('img');
  const followup = document.querySelector('.explosion-followup');
  if (!explosionBackdrop || !explosionImage) return;

  const source = explosionImage.dataset.src;
  explosionImage.src = `${source}?run=${Date.now()}`;
  explosionBackdrop.style.visibility = 'hidden';
  explosionBackdrop.style.opacity = '0';
  explosionTimer = window.setTimeout(() => {
    explosionBackdrop.style.visibility = 'visible';
    explosionBackdrop.style.opacity = '1';
    explosionTimer = window.setTimeout(() => {
    explosionBackdrop.style.opacity = '0';
      explosionTimer = window.setTimeout(() => {
        if (followup) followup.style.opacity = '1';
      }, 450);
      explosionImage.removeAttribute('src');
      explosionTimer = window.setTimeout(() => {
      explosionBackdrop.style.visibility = 'hidden';
        explosionTimer = null;
      }, 450);
    }, 500);
  }, 850);
}

function addCharacterWobble() {
  document.querySelectorAll('h1, h2').forEach((heading) => {
    let characterIndex = 0;
    if (heading.classList.contains('z-stretch')) return;
    if (heading.classList.contains('shatter-text')) {
      heading.querySelectorAll(':scope > span').forEach((letter, letterIndex) => {
        letter.classList.add('wobble-letter');
        letter.style.setProperty('--wobble-delay', `${letterIndex * -0.07}s`);
        letter.style.setProperty('--type-delay', `${characterIndex * 0.075}s`);
        letter.classList.add('is-typed');
        characterIndex += 1;
      });
      return;
    }

    const words = heading.textContent.match(/\S+|\s+/g) || [];
    heading.textContent = '';
    words.forEach((word) => {
      if (/\s+/.test(word)) {
        heading.appendChild(document.createTextNode(word));
        return;
      }

      const wordElement = document.createElement('span');
      wordElement.className = 'wobble-word';
      [...word].forEach((character, letterIndex) => {
        const letter = document.createElement('span');
        letter.className = 'wobble-letter';
        letter.textContent = character;
        letter.style.setProperty('--wobble-delay', `${letterIndex * -0.07}s`);
        letter.style.setProperty('--type-delay', `${characterIndex * 0.075}s`);
        letter.classList.add('is-typed');
        characterIndex += 1;
        wordElement.appendChild(letter);
      });
      heading.appendChild(wordElement);
    });

    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    cursor.textContent = '_';
    cursor.setAttribute('aria-hidden', 'true');
    heading.appendChild(cursor);
  });
}

function resetTypewriter() {
  typewriterTimers.forEach((timer) => window.clearTimeout(timer));
  typewriterTimers = [];
  document.querySelectorAll('.typewriter-cursor').forEach((cursor) => { cursor.hidden = true; });
  document.querySelectorAll('h1:not(.z-stretch) .wobble-letter, h2:not(.z-stretch) .wobble-letter')
    .forEach((letter) => letter.classList.remove('is-typed'));
}

function startTypewriter() {
  const heading = document.querySelector('.slide.is-active h1, .slide.is-active h2:not(.shatter-text):not(.z-stretch)');
  if (!heading) return;

  const letters = [...heading.querySelectorAll('.wobble-letter')];
  const cursor = heading.querySelector('.typewriter-cursor');
  letters.forEach((letter, index) => {
    typewriterTimers.push(window.setTimeout(() => {
      letter.classList.add('is-typed');
    }, index * 40));
  });
  if (cursor) cursor.hidden = false;
}

function updateTypewriterCursors() {
  document.querySelectorAll('.typewriter-cursor').forEach((cursor) => {
    const heading = cursor.parentElement;
    if (!heading?.closest('.slide.is-active')) {
      cursor.hidden = true;
      return;
    }

    const visibleLetters = [...heading.querySelectorAll('.wobble-letter')]
      .filter((letter) => Number.parseFloat(getComputedStyle(letter).opacity) > 0.5);
    const lastLetter = visibleLetters.at(-1);
    if (!lastLetter) {
      cursor.hidden = true;
      return;
    }

    const headingBox = heading.getBoundingClientRect();
    const letterBox = lastLetter.getBoundingClientRect();
    cursor.hidden = false;
    cursor.style.left = `${letterBox.right - headingBox.left + 3}px`;
    cursor.style.top = `${letterBox.top - headingBox.top + letterBox.height * 0.55}px`;
  });
}

function stopZStretch() {
  if (zStretchTimer !== null) window.clearInterval(zStretchTimer);
  zStretchTimer = null;
}

function startZStretch() {
  stopZStretch();
  const heading = document.querySelector('.z-stretch');
  if (!heading) return;

  const cursor = document.createElement('span');
  cursor.className = 'sequence-cursor';
  cursor.textContent = '_';
  cursor.setAttribute('aria-hidden', 'true');
  const render = (zText) => heading.replaceChildren(
    document.createTextNode(`${prefix}${zText}`),
    cursor,
    document.createTextNode(suffix),
  );

  const prefix = heading.dataset.prefix || 'pl';
  const suffix = heading.dataset.suffix || '';
  const totalZs = 5;
  let zCount = 1;
  render('z'.repeat(zCount));
  zStretchTimer = window.setInterval(() => {
    zCount += 1;
    render('z'.repeat(zCount));
    if (zCount === totalZs) stopZStretch();
  }, 250);
}

function resetShatter() {
  if (shatterTimer !== null) window.clearTimeout(shatterTimer);
  if (physicsFrame !== null) window.cancelAnimationFrame(physicsFrame);
  shatterTimer = null;
  physicsFrame = null;
  fragments.forEach(({ element }) => element.remove());
  fragments = [];

  const shatterText = document.querySelector('.shatter-text');
  if (shatterText) {
    shatterText.classList.remove('is-shattered');
    shatterText.querySelectorAll('span').forEach((letter) => {
      letter.style.visibility = '';
    });
  }
}

function simulateFragments(timestamp) {
  let moving = false;
  fragments.forEach((fragment) => {
    fragment.vx += tiltX * 0.08;
    fragment.vy += tiltY * 0.08;
    fragment.vy += 0.4;
    fragment.x += fragment.vx;
    fragment.y += fragment.vy;
    fragment.rotation += fragment.spin;

    if (fragment.x <= 0 || fragment.x + fragment.width >= window.innerWidth) {
      fragment.x = Math.max(0, Math.min(fragment.x, window.innerWidth - fragment.width));
      fragment.vx *= -0.72;
      fragment.spin *= 0.9;
    }

    if (fragment.y + fragment.height >= window.innerHeight) {
      fragment.y = window.innerHeight - fragment.height;
      fragment.vy *= -0.45;
      fragment.vx *= 0.93;
      fragment.spin *= 0.88;
    }

    fragment.element.style.transform = `translate3d(${fragment.x}px, ${fragment.y}px, 0) rotate(${fragment.rotation}deg)`;
    moving ||= Math.abs(fragment.vx) > 0.08 || Math.abs(fragment.vy) > 0.08 || Math.abs(fragment.spin) > 0.08;
  });

  if (moving) physicsFrame = window.requestAnimationFrame(simulateFragments);
  else physicsFrame = null;
}

function createShatterFragments() {
  const shatterText = document.querySelector('.shatter-text');
  if (!shatterText) return;

  shatterText.classList.add('is-shattered');
  shatterText.querySelectorAll('span').forEach((letter, letterIndex) => {
    if (!letter.textContent.trim()) return;

    const box = letter.getBoundingClientRect();
    for (let pieceIndex = 0; pieceIndex < 3; pieceIndex += 1) {
      const element = document.createElement('span');
      const angle = ((letterIndex + pieceIndex) % 2 === 0 ? -1 : 1) * (0.8 + Math.random() * 0.5);
      element.className = `physics-piece piece-${pieceIndex}`;
      element.textContent = letter.textContent;
      element.setAttribute('aria-hidden', 'true');
      element.style.width = `${box.width}px`;
      element.style.height = `${box.height}px`;
      element.style.fontSize = getComputedStyle(letter).fontSize;
      element.style.left = '0';
      element.style.top = '0';
      document.body.appendChild(element);

      fragments.push({
        element,
        width: box.width,
        height: box.height,
        x: box.left,
        y: box.top,
        vx: Math.cos(angle) * (8 + Math.random() * 5),
        vy: -(10 + Math.random() * 6),
        rotation: 0,
        spin: (pieceIndex - 1) * 3.5 + (Math.random() - 0.5) * 3,
      });
    }
  });

  physicsFrame = window.requestAnimationFrame(simulateFragments);
}

function startShatter() {
  resetShatter();
  if (!document.querySelector('.shatter-text')?.closest('.slide.is-active')) return;
  shatterTimer = window.setTimeout(createShatterFragments, 900);
}

function stopNumberGrowth() {
  if (growthTimer !== null) {
    window.clearInterval(growthTimer);
    window.clearTimeout(growthTimer);
    growthTimer = null;
  }
}

function startNumberGrowth() {
  if (!growingNumber) return;
  stopNumberGrowth();
  const cursor = document.createElement('span');
  cursor.className = 'sequence-cursor';
  cursor.textContent = '_';
  cursor.setAttribute('aria-hidden', 'true');
  const render = (text, animateLastZero = false) => {
    const characters = [...text].map((character) => {
      const span = document.createElement('span');
      span.className = `number-character${character === '0' ? ' number-zero' : ''}`;
      span.textContent = character;
      return span;
    });
    if (animateLastZero && characters.length > 0 && text.endsWith('0')) {
      characters.at(-1).classList.add('number-zero-new');
    }
    cursor.hidden = text.includes('0');
    growingNumber.replaceChildren(...characters, cursor);
  };
  render('');

  const addZeros = (amount, delay, next) => {
    let remaining = amount;
    const addNextZero = () => {
      const currentNumber = [...growingNumber.querySelectorAll('.number-character')]
        .map((character) => character.textContent)
        .join('');
      const nextNumber = `${currentNumber}0`;
      render(nextNumber, true);
      if (nextNumber === 'x100') {
        document.querySelector('.final-slide .typewriter-cursor')?.remove();
      }
      remaining -= 1;
      growthTimer = remaining > 0
        ? window.setTimeout(addNextZero, delay)
        : window.setTimeout(next, 1000);
    };

    addNextZero();
  };

  const addRapidZeros = () => {
    const currentNumber = [...growingNumber.querySelectorAll('.number-character')]
      .map((character) => character.textContent)
      .join('');
    render(`${currentNumber}0`, true);
    growthTimer = window.setTimeout(addRapidZeros, 70);
  };

  growthTimer = window.setTimeout(() => {
    render('x1');
    growthTimer = window.setTimeout(() => {
      addZeros(2, 300, () => addZeros(2, 300, addRapidZeros));
    }, 1000);
  }, 1000);
}

function showSlide(index) {
  const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
  if (nextIndex === activeIndex) return;
  activeIndex = nextIndex;
  stopNumberGrowth();
  resetTypewriter();
  resetShatter();
  resetExplosion();
  stopZStretch();

  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle('is-active', slideIndex === activeIndex);
  });

  startTypewriter();

  if (document.querySelector('.shatter-text')?.closest('.slide.is-active')) {
    startShatter();
    startExplosion();
  }

  if (document.querySelector('.z-stretch')?.closest('.slide.is-active')) startZStretch();

  nextButton.disabled = activeIndex === slides.length - 1;
  nextButton.classList.toggle('is-hidden', false);
  nextButton.querySelector('.swipe-hand')?.classList.toggle('is-hidden', activeIndex !== 0);
  if (activeIndex === slides.length - 1) startNumberGrowth();
}

function moveSlide(direction) {
  showSlide(activeIndex + direction);
}

nextButton.addEventListener('click', () => {
  enableMotionControls();
  moveSlide(1);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') moveSlide(-1);
  if (event.key === 'ArrowRight' || event.key === ' ') {
    event.preventDefault();
    moveSlide(1);
  }
});

let wheelLocked = false;
document.addEventListener('wheel', (event) => {
  if (wheelLocked || Math.abs(event.deltaY) < 12) return;

  wheelLocked = true;
  moveSlide(event.deltaY > 0 ? 1 : -1);
  window.setTimeout(() => { wheelLocked = false; }, 550);
}, { passive: true });

let touchStartX = 0;
document.addEventListener('touchstart', (event) => {
  enableMotionControls();
  touchStartX = event.changedTouches[0].screenX;
}, { passive: true });
document.addEventListener('touchend', (event) => {
  const distance = event.changedTouches[0].screenX - touchStartX;
  if (Math.abs(distance) > 50) moveSlide(distance < 0 ? 1 : -1);
}, { passive: true });

addCharacterWobble();
window.setInterval(updateTypewriterCursors, 50);
showSlide(0);
