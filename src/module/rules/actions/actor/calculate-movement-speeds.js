import { SFRPG } from "../../../config.js";
import { SFRPGEffectType, SFRPGModifierType, SFRPGModifierTypes} from "../../../modifiers/types.js";

export default function (engine) {
    engine.closures.add( "calculateMovementSpeeds", (fact, context) => {
        const data = fact.data;
        const modifiers = fact.modifiers;

        const addModifier = (bonus, data, item, localizationKey, speedKey) => {
            if (bonus.modifierType === SFRPGModifierType.FORMULA) {
                if (item.rolledMods) {
                    item.rolledMods.push({mod: bonus.modifier, bonus: bonus});
                } else {
                    item.rolledMods = [{mod: bonus.modifier, bonus: bonus}];
                }

                return 0;
            }

            const roll = new Roll(bonus.modifier.toString(), data).evaluate({maximize: true});
            const computedBonus = roll.total;

            if (computedBonus !== 0 && localizationKey) {
                item.tooltip.push(game.i18n.format(localizationKey, {
                    speed: SFRPG.speeds[speedKey],
                    type: bonus.type.capitalize(),
                    mod: computedBonus.signedString(),
                    source: bonus.name
                }));
            }
            
            return computedBonus;
        };

        for (const speedKey of Object.keys(SFRPG.speeds)) {
            if (speedKey === "special") {
                continue;
            }

            const baseValue = Number(data.attributes.speed[speedKey].base);

            const supportedTypes = [SFRPGEffectType.ALL_SPEEDS, SFRPGEffectType.SPECIFIC_SPEED];
            let filteredModifiers = fact.modifiers.filter(mod => {
                return (mod.enabled || mod.modifierType === "formula") && (mod.effectType === SFRPGEffectType.ALL_SPEEDS || (mod.effectType === SFRPGEffectType.SPECIFIC_SPEED && mod.valueAffected === speedKey))
            });
            filteredModifiers = context.parameters.stackModifiers.process(filteredModifiers, context);
    
            const bonus = Object.entries(filteredModifiers).reduce((sum, mod) => {
                if (mod[1] === null || mod[1].length < 1) return sum;
    
                if ([SFRPGModifierTypes.CIRCUMSTANCE, SFRPGModifierTypes.UNTYPED].includes(mod[0])) {
                    for (const bonus of mod[1]) {
                        sum += addModifier(bonus, data, data.attributes.speed, "SFRPG.ActorSheet.Modifiers.Tooltips.Speed", speedKey);
                    }
                } else {
                    sum += addModifier(mod[1], data, data.attributes.speed, "SFRPG.ActorSheet.Modifiers.Tooltips.Speed", speedKey);
                }
    
                return sum;
            }, 0);

            data.attributes.speed[speedKey].value = Math.max(0, baseValue + bonus);
        }

        return fact;
    }, { required: ["stackModifiers"], closureParameters: ["stackModifiers"] } );
}