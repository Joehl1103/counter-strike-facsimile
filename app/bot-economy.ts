import { FIREARMS, EQUIPMENT_PRICES, createStarterSecondaryAmmo, getStarterSecondaryForSide, isPrimaryWeaponKind, resolveAmmoPurchase, resolveArmorPurchase, resolveDefuseKitPurchase, getBotRoundFirearm, addMoney, type PrimaryWeaponKind, type FirearmAmmo, type FirearmKind, type SecondaryWeaponKind, type Side } from './game-rules.ts';
export type BotInventory = {
  stowedPrimary: { weapon: PrimaryWeaponKind; ammo: FirearmAmmo } | null;
  money: number; weapon: FirearmKind; ammo: FirearmAmmo;
  secondaryWeapon: SecondaryWeaponKind; secondaryAmmo: FirearmAmmo;
  armor: number; helmet: boolean; hasDefuseKit: boolean;
  grenades: number; smokes: number; flashes: number;
};
export function createBotInventory(side: Side, money = 800): BotInventory {
  const secondaryWeapon = getStarterSecondaryForSide(side);
  const ammo = createStarterSecondaryAmmo(side);
  return {stowedPrimary:null,money:addMoney(money,0),weapon:secondaryWeapon,ammo,secondaryWeapon,secondaryAmmo:{...ammo},
    armor:0,helmet:false,hasDefuseKit:false,grenades:0,smokes:0,flashes:0};
}
export function prepareBotInventory(previous: BotInventory, options: {
  side: Side; survived: boolean; resetMoney: number | null;
  roundIndex: number; rosterRoundIndex: number; botId: number; lossStreak: number; assignedDefuseKit: boolean;
}): BotInventory {
  const {side,resetMoney}=options;
  const next = resetMoney !== null || !options.survived
    ? createBotInventory(side,resetMoney ?? previous.money)
    : {...previous,ammo:{...previous.ammo},secondaryAmmo:{...previous.secondaryAmmo},stowedPrimary:previous.stowedPrimary && {...previous.stowedPrimary,ammo:{...previous.stowedPrimary.ammo}}};
  if (next.stowedPrimary) {
    next.secondaryAmmo = {...next.ammo};
    next.weapon = next.stowedPrimary.weapon;
    next.ammo = {...next.stowedPrimary.ammo};
    next.stowedPrimary = null;
  }
  const desired=getBotRoundFirearm({matchRoundIndex:options.roundIndex,rosterRoundIndex:options.rosterRoundIndex,botId:options.botId,lossStreak:options.lossStreak,side});
  if (isPrimaryWeaponKind(desired) && !isPrimaryWeaponKind(next.weapon) && next.money >= FIREARMS[desired].price) {
    next.money-=FIREARMS[desired].price;
    next.weapon=desired;
    next.ammo={magazine:FIREARMS[desired].magazineSize,reserve:0};
  }
  const buyAmmo=(kind:FirearmKind, ammo:FirearmAmmo) => {
    // At most enough purchases to fill a reserve; no free between-round reload.
    while (ammo.reserve < FIREARMS[kind].maxReserve) {
      const purchase=resolveAmmoPurchase({kind,money:next.money,reserve:ammo.reserve});
      if (!purchase.purchased) break;
      next.money=purchase.money;ammo.reserve=purchase.reserve;
    }
  };
  let armor=resolveArmorPurchase({money:next.money,armor:next.armor,helmet:next.helmet,kind:'assault-suit'});
  if (!armor.purchased) armor=resolveArmorPurchase({money:next.money,armor:next.armor,helmet:next.helmet,kind:'kevlar'});
  if (armor.purchased) {next.money=armor.money;next.armor=armor.armor;next.helmet=armor.helmet;}
  const kit=resolveDefuseKitPurchase({money:next.money,side,hasDefuseKit:next.hasDefuseKit});
  if (options.assignedDefuseKit && kit.purchased) {next.money=kit.money;next.hasDefuseKit=kit.hasDefuseKit;}
  if(side==='t') next.hasDefuseKit=false;
  buyAmmo(next.weapon,next.ammo);
  if (isPrimaryWeaponKind(next.weapon)) buyAmmo(next.secondaryWeapon,next.secondaryAmmo);
  else next.secondaryAmmo={...next.ammo};
  for (const [field,price] of [['grenades',EQUIPMENT_PRICES.grenade],['smokes',EQUIPMENT_PRICES.smoke],['flashes',EQUIPMENT_PRICES.flash]] as const) {
    if(next[field]===0 && next.money>=price) {next[field]=1;next.money-=price;}
  }
  return next;
}

export function switchExhaustedBotInventory(previous: BotInventory): BotInventory | null {
  if (!isPrimaryWeaponKind(previous.weapon) || previous.ammo.magazine > 0 || previous.ammo.reserve > 0
    || previous.secondaryAmmo.magazine + previous.secondaryAmmo.reserve <= 0) return null;
  return {...previous, stowedPrimary:{weapon:previous.weapon,ammo:{...previous.ammo}},
    weapon:previous.secondaryWeapon,ammo:{...previous.secondaryAmmo},secondaryAmmo:{...previous.secondaryAmmo}};
}
