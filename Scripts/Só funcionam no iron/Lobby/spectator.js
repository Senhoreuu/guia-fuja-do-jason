// spec-jason

Commands.register(':spec', true, (user, message) => {
    if (!game.spectator || !game.playersCount) {
        return user.message('Não é possível espectar por agora.', 23);
    }

    const rooms_obj = {
        'castelo': '889766', 'caverna': '889799', 'casa': '889823', 'misterio': '889837', 'pantano': '889873', 'acampamento': '889904', 'choice': '892636', 'caminhos': '893095', 'convençao': '893118', 'inferno': '893132', 'selva': '893148', 'biblioteca': '893454', 'hotel': '893728', 'laboratorio': '893958', 'apocalipse': '899867', 'mortinhos': '899870', 'veneno': '907232', 'picnic': '907233', 'fantasma': '912756', 'morte': '913470', 'cemiterio': '913593', 'rua': '913961', 'escuridao': '914166', 'tempestade': '914201', 'espinhos': '915048', 'assombraçao': '915847', 'calafrios': '924104', 'ponte': '996225'
    };

    const args = message.split(' ');

    const id = user.getId();

    if (game.players[id].entry < 5) {
        return user.message('Para espectar você precisa ter participado pelo menos 5 vezes!', 9);
    }

    function getRoomObj() {
        user.message('Teleportando para o quarto ' + args[1].toLowerCase(), 9);
        return rooms_obj[args[1].toLowerCase()];
    }

    function getRandomRoom() {
        let target = null;

        if (args[1] && !args[1].toLowerCase() !== 'aleatorio') {
            target = GlobalData.getPlayerDataByName(args[1]);

            if (target) {
                const target_id = target.getId();

                const roomTargetId = GlobalStorage.get(`playerInRoom:${args[1].toLowerCase()}`);

                if (!roomTargetId || !game.players[target_id]) {
                    user.message('Este usuário não existe nos registros do Jason.', 9);
                    return false;
                }

                user.message(`Você está seguindo ${args[1]} agora!`, 9);

                game.players[id].following = { id: target_id, name: args[1] };
                game.players[target_id].followers[id] = { id, name: user.getUsername().toLowerCase() };

                return roomTargetId;
            }
        }

        user.message('Teleportando para um quarto aleatório', 9);
        const [str] = Object.values(rooms_obj).sort(() => Math.random() - 0.5);
        return str;
    }

    const roomGo = rooms_obj[args[1]?.toLowerCase()] ? getRoomObj() : getRandomRoom();

    if (typeof roomGo !== 'string') return;

    game.players[id].spectator = true;
    Events.sendMessageToRoom(Number(roomGo), 'updateRoom', JSON.stringify(game.players));

    wait(() => {
        user.notification('JASON', 'Você será teleportado(a)!');
        user.gotoRoom(Number(roomGo));
    }, 2, true);

    save();
});