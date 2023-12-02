const LOCAL_PLAYER_ID = getLocalPlayerUniqueID(); //自身ID
let POS_Y_MAX = 83; //最高Y坐标
let MAX_RANGE = 500; //最远范围
let ATTACK_COUNT = 3; //攻击和点击次数
let AUTO_INTERVAL = 15; //自动传送间隔

//以下用于控制开关或记录数据(上方用于默认调参)
let AutoMode = false; //自动手动切换,默认为手动
let Team = false; //智能队友开关,默认关闭
let autotp = false; //是否自动tp,默认为不
let backPos = null; //自动返回记录的坐标
let backMotion = null; //自动返回所记录的移动值
let target = null; //攻击目标唯一数字ID
let attackCount = 0; //剩余攻击次数
let mode = true; //控制传送模式,默认Pos
let tick = 0;

//一些代码的封装
const setPos = p => setEntityPos(LOCAL_PLAYER_ID, p.x, p.y, p.z);
const setMotion = m => setEntityMotion(LOCAL_PLAYER_ID, m.x, m.y, m.z);
const getPos = () => getEntityPos(LOCAL_PLAYER_ID);
const getMotion = () => getEntityMotion(LOCAL_PLAYER_ID);
const getRange = (f, t) => Math.hypot(f.x - t.x, f.y - t.y, f.z - t.z);
const click = p => buildBlock(LOCAL_PLAYER_ID, p.x, p.y, p.z, 0);
const COLLISION_X_MIN = 0.1; //最低X碰撞箱
const COLLISION_Y_MIN = 0.1; //最低Y碰撞箱

//寻找目标
function attack() {
    const localPlayerPos = getPos(); //获取自身坐标,用于和其他玩家的坐标进行对比
    let minRange = MAX_RANGE; //最近一个玩家和自身的距离
    for (const id of getPlayerList()) {
        if (id === LOCAL_PLAYER_ID) continue; //遍历到自身则跳过
        const collision = getEntitySize(id);
        if (Team && collision.x < COLLISION_X_MIN && collision.y < COLLISION_Y_MIN) continue;
        const pos = getEntityPos(id);
        if (pos.y >= POS_Y_MAX) continue; //超过高度上限则跳过
        const range = getRange(localPlayerPos, pos);
        if (range < minRange) {
            minRange = range;
            target = id;
        }
    }
    if (target) { //如果寻找到到目标
        attackCount = ATTACK_COUNT; //设置攻击次数
        backPos = localPlayerPos; //记录坐标
        backMotion = getMotion(); //记录移动值
        teleport(); //传送至目标
    } else clientMessage('§lRunAway >> §rInfiniteAura : §b没有合适的目标');
}

function teleport() { //计算偏移并且通过移动值传送到目标位置
    attackCount--;
    const pos = getEntityPos(target);
    if (mode) {
        setPos({
            x: pos.x,
            y: pos.y,
            z: pos.z
        });
    } else {
        setMotion({
            x: pos.x - backPos.x,
            y: pos.y - backPos.y,
            z: pos.z - backPos.z
        });
    }
}

function onTickEvent() {
    if (autotp && AutoMode) {
        if (!tick--) {
            attack();
            tick = AUTO_INTERVAL;
        }
    } else tick = 0;
    if (backPos) {
        if (mode) {
            executeCommand("/ww tp " + backPos.x + " " + backPos.y + " " + backPos.z);
            click(backPos);
            attackEntity(target, true);
        } else {
            setPos(backPos);
            click(backPos);
            attackEntity(target, true);
        }
    }
    if (target) {
        if (attackCount) {
            teleport();
        } else {
            if (mode) {
                backPos = backMotion = target = null;
            } else {
                setMotion(backMotion);
                backPos = backMotion = target = null;
            }
        }
    }
}

function onExecuteCommandEvent(command) {
    switch (command) {
        case '/InfiniteAura exit':
            clientMessage('§lRunAway > Exit InfiniteAura §c✘');
            while (attackCount--) back();
            exit();
            break;
        case '/InfiniteAura Set_Y_MAX':
            let pos = getEntityPos(LOCAL_PLAYER_ID);
            let Y = Math.ceil(pos.y) - 1;
            POS_Y_MAX = Y;
            clientMessage('§lRunAway >> §rInfiniteAura : §b已将MAX_Y设置为' + Y);
            break;
        case '/InfiniteAura Team':
            Team = !Team;
            if (Team) clientMessage('§lRunAway >> §rInfiniteAura : §eTeam §b✔');
            else clientMessage('§lRunAway >> §rInfiniteAura : §eTeam §c✘');
            break;
        case '/InfiniteAura MOVEMode':
            mode = !mode;
            if (mode) clientMessage('§lRunAway >> §rInfiniteAura : Mode-§bPos');
            else clientMessage('§lRunAway >> §rInfiniteAura : Mode-§eMotion');
            break;
        case '/InfiniteAura AutoMode':
            AutoMode = !AutoMode;
            if (AutoMode) clientMessage('§lRunAway >> §rInfiniteAura : §eAutoTp §b✔');
            else clientMessage('§lRunAway >> §rInfiniteAura : §eAutoTp §c✘');
            break;
        case '/InfiniteAura Attack':
            if (AutoMode) {
                autotp = !autotp;
                if (autotp) clientMessage('§lRunAway >> §7InfiniteAura — Enabled §b✔')
                else clientMessage('§lRunAway >> §7InfiniteAura — Disabled §c✘');
            } else {
                if (!attackCount) attack();
                else clientMessage('§lRunAway >> §rInfiniteAura : §b操作过快');
            }
            break;
        default:
            if (/^\/Set (ATTACK_COUNT|MAX_RANGE|POS_Y_MAX|AUTO_INTERVAL)/.test(command)) {
                const regex = /^\/Set (ATTACK_COUNT|MAX_RANGE|POS_Y_MAX|AUTO_INTERVAL) (\d+)$/;
                const match = command.match(regex);
                if (match) {
                    const option = match[1];
                    const value = parseInt(match[2]);
                    if (option === "ATTACK_COUNT") {
                        ATTACK_COUNT = value;
                        clientMessage('§lRunAway >> §rInfiniteAura : §b已将ATTACK_COUNT设置为' + value);
                    }
                    if (option === "MAX_RANGE") {
                        MAX_RANGE = value;
                        clientMessage('§lRunAway >> §rInfiniteAura : §b已将MAX_RANGE设置为' + value);
                    }
                    if (option === "POS_Y_MAX") {
                        POS_Y_MAX = value;
                        clientMessage('§lRunAway >> §rInfiniteAura : §b已将POS_Y_MAX设置为' + value);
                    }
                    if (option === "AUTO_INTERVAL") {
                        AUTO_INTERVAL = value;
                        clientMessage('§lRunAway >> §rInfiniteAura : §b已将AUTO_INTERVAL设置为' + value);
                    }
                }
                return true;
            }
            return;
    }
    return true;
}

clientMessage('§lRunAway > Load InfiniteAura §b✔');