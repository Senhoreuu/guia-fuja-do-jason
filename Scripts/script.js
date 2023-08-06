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

    document.querySelector('footer').classList.add('hide');

    const connections = tree[id].rooms;

    setTimeout(() => {
        console.log();
        if (Number(article.style.opacity) < 0) {
            createNewConnection(id, connections);
            showAllCards(false);
            return;
        }

        const duration = 200;
        let opacity = 1;
        const intervalTime = 10;
        const steps = duration / intervalTime;

        const interval = setInterval(() => {
            opacity -= 1 / steps;
            article.style.opacity = opacity;

            if (opacity <= 0) {
                article.style.opacity = -1;
                clearInterval(interval);
                article.style.width = '0%';
                card_container.style.width = '100%';
                card_container.style.height = '100%';
                showAllCards(false);
                createNewConnection(id, connections);
            }
        }, intervalTime);
    }, 100);
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

const footer = document.querySelector('footer');

async function initApp() {
    const rooms = await loadRooms();

    await fetch('./Rooms/ways_tree.json')
        .then(response => response.json())
        .then(data => tree = data);

    rooms.forEach((room) => {
        rooms_name.push(room.id);
        const card = createCard(room);
        cards.push(card);
        article.append(card);
    });

    footer.classList.add('hide');

    setTimeout(() => {
        showCardsOnScroll();
        footer.classList.remove('hide');
    }, 300);

    document.addEventListener('scroll', showCardsOnScroll);
}

document.querySelector('#search').addEventListener('input', (input) => {

    article.style.width = '100%';
    article.style.opacity = 1;
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
        div.classList.add('text');
        setTimeout(() => div.classList.add('opacity'), 100);
        div.setAttribute('id', normalize(connection).toLowerCase());

        div.addEventListener('click', createTree);

        div.innerHTML = `<h2>${connection}</h2>
                        <div class="card-tree">
                            <img src="./images/${normalize(connection).toLowerCase()}.png" class="tree-image">
                        </div>`;

        root.appendChild(div);
    }

    const main = document.createElement('div');
    main.classList.add('main-root');
    const div_center = document.createElement('div');
    div_center.classList.add('text');
    setTimeout(() => div_center.classList.add('opacity'), 100);
    const h2 = document.createElement('h2');
    h2.innerText = id;
    const card_tree = document.createElement('div');
    card_tree.classList.add('card-tree');
    const img = document.createElement('img');
    img.src = `./images/${id}.png`;
    img.style.padding = "padding: 1rem 1rem 1rem 1rem;";
    img.style.width = "370px";

    card_tree.appendChild(img);

    div_center.appendChild(h2);
    div_center.appendChild(card_tree);

    main.appendChild(div_center);

    card_container.appendChild(main);
    card_container.appendChild(root);

    header.appendChild(card_container);

    scrollToBottom()
};

function scrollToBottom() {
    const docHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
    );

    const windowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    const scrollStep = Math.PI / (100 / 20);

    let scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;

    function scrollAnimation() {
        scrollY = scrollY < docHeight - windowHeight ? scrollY + Math.sin(scrollStep) * 30 : docHeight - windowHeight;
        window.scrollTo(0, scrollY);

        if (scrollY < docHeight - windowHeight) {
            setTimeout(scrollAnimation, 15);
        }
    }

    scrollAnimation();
}

initApp();