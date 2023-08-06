let rooms_name = [];
let cards = [];
let tree = {};

const article = document.querySelector('article');
const card_container = document.querySelector('.card-container');
const header = document.querySelector('header');

function normalize(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function createTree(event) {
    const id = event.currentTarget.id;
    if (!rooms_name.includes(id)) return;

    showAllCards(false);
    document.querySelector('footer').classList.add('hide');

    const connections = tree[id].rooms;

    article.style.width = '0%';
    card_container.style.width = '100%';
    card_container.style.height = '100%';

    createNewConnection(id, connections);
}

function createCard(room) {
    const div = document.createElement('div');
    div.classList.add('card');
    div.addEventListener('click', createTree);
    div.setAttribute('data-aos', 'fade');
    div.setAttribute('id', room.id);

    const title = document.createElement('h2');
    title.textContent = room.room_name;

    const img = document.createElement('img');
    img.setAttribute('loading', 'lazy');
    img.classList.add('img');
    img.src = room.link;

    div.appendChild(title);
    div.appendChild(img);

    return div;
}

async function loadRooms() {
    try {
        const response = await fetch('./Rooms/rooms.json');
        const data = await response.json();
        const prefix = (name) => `./images/${name}.png`;

        const rooms = data.rooms.map((room) => {
            const room_name = room.room_name;
            const normalized = normalize(room_name);
            const link = prefix(normalized.toLowerCase());

            return {
                id: normalized.toLowerCase(),
                room_name: room_name,
                link: link,
            };
        });

        return rooms;
    } catch (error) {
        console.error('Error: ', error);
        return [];
    }
}

function showCardsOnScroll() {
    const cards = document.querySelectorAll('div.card');
    cards.forEach((card) => {
        if (isElementInViewport(card)) {
            card.classList.add('show');
        }
    });
}

function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom - 300 <= (window.innerHeight || document.documentElement.clientHeight);
}

function filterCards(searching) {
    const cards = document.querySelectorAll('div.card');
    const normalizedSearching = searching.toLowerCase();

    cards.forEach((card) => {
        const cardId = card.id.toLowerCase();
        if (cardId.includes(normalizedSearching)) {
            card.classList.add('show');
            card.classList.remove('hide');
        } else {
            card.classList.add('hide');
            card.classList.remove('show');
        }
    });
}

function showAllCards(show = true) {
    const cards = document.querySelectorAll('div.card');
    cards.forEach((card) => {
        if (show) {
            card.classList.remove('hide');
            card.classList.add('show');
        }
        else {
            card.classList.add('hide');
            card.classList.remove('show');
        }
    });
}

async function initApp() {
    const rooms = await loadRooms();

    document.querySelector('.map').addEventListener('click', (e) => {
        e.preventDefault();

        window.location.href = 'https://caminhos-jason.vercel.app/';
    });
    
    document.querySelector('.hw-play').addEventListener('click', (e) => {
        e.preventDefault();

        window.location.href = 'https://caminhos-jason.vercel.app/pages/como_jogar.html';
    });

    await fetch('./Rooms/ways_tree.json')
        .then(response => response.json())
        .then(data => tree = data);

    rooms.forEach((room) => {
        rooms_name.push(room.id);
        const card = createCard(room);
        cards.push(card);
        article.append(card);
    });

    setTimeout(showCardsOnScroll, 1000);
    document.addEventListener('scroll', showCardsOnScroll);
}

const footer = document.querySelector('footer');

document.querySelector('#search').addEventListener('input', (input) => {

    article.style.width = '100%';
    card_container.style.width = '0%';
    card_container.style.height = '0%';

    card_container.innerHTML = '';

    const searchText = input.target.value.trim();
    if (searchText === "") {
        footer.classList.remove('hide');
        showAllCards();
    }
    else {
        footer.classList.add('hide');
        filterCards(searchText);
    }
});

function createNewConnection(id, connections) {
    const root = document.createElement('div');
    root.classList.add('root');

    for (const connection of connections) {
        const div = document.createElement('div');
        div.classList.add('center');
        div.setAttribute('id', normalize(connection).toLowerCase());

        div.addEventListener('click', createTree);

        div.innerHTML = `<h2>${connection}</h2>
                        <div  class="card-tree">
                            <img src="./images/${normalize(connection).toLowerCase()}.png" class="tree-image">
                        </div>`;

        root.appendChild(div);
    }

    const main = document.createElement('div');
    main.classList.add('main-root');
    const div_center = document.createElement('div');
    div_center.classList.add('center');
    const h2 = document.createElement('h2');
    h2.innerText = id;
    const card_tree = document.createElement('div');
    card_tree.classList.add('card-tree');
    const img = document.createElement('img');
    img.src = `./images/${id}.png`;

    card_tree.appendChild(img);

    div_center.appendChild(h2);
    div_center.appendChild(card_tree);

    main.appendChild(div_center);

    card_container.appendChild(main);
    card_container.appendChild(root);

    header.appendChild(card_container);
};

initApp();