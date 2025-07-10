namespace platformer {
    class CharacterAnimation {
        startFrames: Image[];
        loopFrames: Image[];
        startInterval: number;
        loopInterval: number;

        constructor(public rule: number) {
        }
    }

    class CharacterState {
        protected animations: CharacterAnimation[];

        protected timer: number;
        protected frame: number;
        protected current: CharacterAnimation;
        protected enabled: boolean;
        protected runningStartFrames: boolean;

        protected renderable: scene.Renderable;

        protected currentImage: Image;

        constructor(public sprite: PlatformerSprite) {
            this.animations = [];
            this.timer = 0;
            this.frame = 0;
            this.setEnabled(true);

            this.renderable = scene.createRenderable(this.sprite.z + 1, (target, camera) => {
                if (!this.enabled || !this.currentImage) return;

                if (this.sprite.flags & sprites.Flag.Destroyed) {
                    this.renderable.destroy();
                    _state().animations.characters.removeElement(this);
                    return;
                }

                let drawX = (this.sprite.flags & SpriteFlag.RelativeToCamera) ? 0 : -camera.drawOffsetX;
                let drawY = (this.sprite.flags & SpriteFlag.RelativeToCamera) ? 0 : -camera.drawOffsetY;
                switch (_state().gravityDirection) {
                    case Direction.Down:
                        drawX += this.sprite.x - (this.currentImage.width / 2);
                        drawY += this.sprite.bottom - this.currentImage.height;
                        break;
                    case Direction.Up:
                        drawX += this.sprite.x - (this.currentImage.width / 2);
                        drawY += this.sprite.top;
                        break;
                    case Direction.Right:
                        drawX += this.sprite.right - this.currentImage.width;
                        drawY += this.sprite.y - (this.currentImage.height / 2);
                        break;
                    case Direction.Left:
                        drawX += this.sprite.left;
                        drawY += this.sprite.y - (this.currentImage.height / 2);
                        break;
                }

                target.drawTransparentImage(this.currentImage, drawX, drawY);
            })
        }

        setFrames(loop: boolean, frames: Image[], interval: number, rule: number) {
            for (const animation of this.animations) {
                if (animation.rule === rule) {
                    if (loop) {
                        animation.loopFrames = frames;
                        animation.loopInterval = interval;
                    }
                    else {
                        animation.startFrames = frames;
                        animation.startInterval = interval;
                    }
                    return;
                }
            }

            const anim = new CharacterAnimation(rule);

            if (loop) {
                anim.loopFrames = frames;
                anim.loopInterval = interval;
            }
            else {
                anim.startFrames = frames;
                anim.startInterval = interval;
            }

            this.animations.push(anim);
        }

        setLoopFrames(frames: Image[], interval: number, rule: number) {
            this.setFrames(true, frames, interval, rule);
        }

        setStartFrames(frames: Image[], interval: number, rule: number) {
            this.setFrames(false, frames, interval, rule);
        }

        update(dt: number) {
            const newAnimation = this.pickRule(this.sprite.sFlags);
            if (newAnimation !== this.current) {
                this.frame = 0;
                this.timer = 0;

                this.runningStartFrames = !!(newAnimation && newAnimation.startFrames);

                this.current = newAnimation;

                if (this.current && this.enabled) {
                    if (this.runningStartFrames) {
                        this.currentImage = this.current.startFrames[0];
                    }
                    else {
                        this.currentImage = this.current.loopFrames[0];
                    }
                }
            }

            if (!this.current || !this.enabled) return;

            this.timer += dt;

            if (this.runningStartFrames) {
                while (this.timer >= this.current.startInterval && this.runningStartFrames) {
                    this.timer -= this.current.startInterval;
                    this.frame++;

                    if (this.frame >= this.current.startFrames.length) {
                        this.runningStartFrames = false;
                        if (this.current.loopFrames) {
                            this.currentImage = this.current.loopFrames[0];
                            this.timer = 0;
                            this.frame = 0;
                        }
                    }
                    else {
                        this.currentImage = this.current.startFrames[this.frame]
                    }
                }
            }
            else if (this.current.loopFrames) {
                while (this.timer >= this.current.loopInterval) {
                    this.timer -= this.current.loopInterval;
                    this.frame = (this.frame + 1) % this.current.loopFrames.length;

                    this.currentImage = this.current.loopFrames[this.frame]
                }
            }
        }

        setEnabled(enabled: boolean) {
            this.enabled = enabled;
            if (enabled && this.current) {
                if (this.runningStartFrames) {
                    this.currentImage = this.current.startFrames[this.frame]
                }
                else {
                    this.currentImage = this.current.loopFrames[this.frame]
                }
            }

            if (!enabled) this.currentImage = undefined;

            this.sprite.setFlag(SpriteFlag.Invisible, enabled);
        }

        clearAnimations() {
            this.animations = [];
            this.current = undefined;
        }

        clearAnimationsForRule(rule: number) {
            let toRemove: CharacterAnimation[] = [];
            for (const animation of this.animations) {
                if (animation.rule === rule) {
                    toRemove.push(animation);
                }
            }

            for (const animation of toRemove) {
                this.animations.removeElement(animation);
            }

            if (this.animations.indexOf(this.current) === -1) {
                this.current = undefined;
            }
        }

        protected pickRule(state: number) {
            // If we have multiple animations with the same best score, we
            // want to prioritize the current animation and then the rest
            // by the order they were added
            let best = this.current;
            let bestScore = this.current && score(state, best.rule);
            let currentScore: number;

            for (const animation of this.animations) {
                currentScore = score(state, animation.rule);
                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    best = animation;
                }
            }

            if (bestScore === 0 || bestScore == undefined) return null;

            return best;
        }
    }

    function score(state: number, rule: number) {
        let res = 0;
        let check = state & rule;

        if (check ^ rule) return 0;

        while (check) {
            if (check & 1) ++res;
            check >>= 1;
        }

        return res;
    }

    export function _matchesRule(state: number, rule: number) {
        return !((state & rule) ^ rule);
    }

    export class _PlatformerAnimationState {
        characters: CharacterState[];

        constructor() {
            this.characters = [];

            game.currentScene().eventContext.registerFrameHandler(scene.ANIMATION_UPDATE_PRIORITY, () => {
                const dt = game.currentScene().eventContext.deltaTimeMillis;
                for (const character of this.characters) character.update(dt);
            });
        }
    }

    /**
     * Loops the passed frames on the sprite at the given interval whenever
     * the specified rule is true for that sprite.
     *
     * If more than one rule applies, the most specific rule will be used.
     * If multiple rules are equally specific, the currently executing rule
     * is favored (or one is chosen at random).
     *
     * @param sprite    the sprite to animate
     * @param frames    the images that make up that animation
     * @param frameInterval the amount of time to spend on each frame in milliseconds
     * @param rule      the rule that decides when this animation will play
     */
    //% blockId=arcade_mp_character_loop_frames
    //% block="$sprite loop frames $frames $frameInterval when $rule"
    //% sprite.defl=mySprite
    //% sprite.shadow=variables_get
    //% frames.shadow=animation_editor
    //% frameInterval.shadow=timePicker
    //% rule.shadow=arcade_mp_character_make_rule
    //% weight=100
    //% blockGap=8
    //% group="Animations"
    export function loopFrames(sprite: Sprite, frames: Image[], frameInterval: number, rule: number) {
        if (!sprite || !frames || !frames.length || !rule) return;
        if (Number.isNaN(frameInterval) || frameInterval < 5) frameInterval = 5;

        _assertPlatformerSprite(sprite);

        const state = getStateForSprite(sprite as PlatformerSprite, true);
        state.setLoopFrames(frames, frameInterval, rule);
    }

    /**
     * Runs the passed frames on the sprite at the given interval whenever
     * the specified rule begins to be true for that sprite. If there are loop
     * frames for a rule, they will take effect after the run is complete.
     *
     * If more than one rule applies, the most specific rule will be used.
     * If multiple rules are equally specific, the currently executing rule
     * is favored (or one is chosen at random).
     *
     * @param sprite    the sprite to animate
     * @param frames    the images that make up that animation
     * @param frameInterval the amount of time to spend on each frame in milliseconds
     * @param rule      the rule that decides when this animation will play
     */
    //% blockId=arcade_mp_character_run_frames
    //% block="$sprite run frames $frames $frameInterval when $rule becomes true"
    //% sprite.defl=mySprite
    //% sprite.shadow=variables_get
    //% frames.shadow=animation_editor
    //% frameInterval.shadow=timePicker
    //% rule.shadow=arcade_mp_character_make_rule
    //% weight=90
    //% group="Animations"
    export function runFrames(sprite: Sprite, frames: Image[], frameInterval: number, rule: number) {
        if (!sprite || !frames || !frames.length || !rule) return;
        if (Number.isNaN(frameInterval) || frameInterval < 5) frameInterval = 5;

        _assertPlatformerSprite(sprite);

        const state = getStateForSprite(sprite as PlatformerSprite, true);
        state.setStartFrames(frames, frameInterval, rule);
    }

    /**
     * Clears all animations registered for the specified sprite.
     *
     * @param sprite The sprite to clear animations for
     */
    //% blockId=arcade_mp_character_clear_animations
    //% block="$sprite clear all animations"
    //% sprite.defl=mySprite
    //% sprite.shadow=variables_get
    //% weight=80
    //% blockGap=8
    //% group="Animations"
    export function clearAnimations(sprite: Sprite) {
        _assertPlatformerSprite(sprite);

        const state = getStateForSprite(sprite as PlatformerSprite, false);
        state.clearAnimations();
    }


    /**
     * Clears all animations registered for the specified sprite with the given rule.
     * This removes both looping animations and animations that run once a rule becomes
     * true.
     *
     * @param sprite The sprite to clear animations for
     * @param rule The rule to clear animations for
     */
    //% blockId=arcade_mp_character_clear_animations_for_rule
    //% block="$sprite clear all animations for rule $rule"
    //% sprite.defl=mySprite
    //% sprite.shadow=variables_get
    //% rule.shadow=arcade_mp_character_make_rule
    //% weight=70
    //% group="Animations"
    export function clearAnimationsForRule(sprite: Sprite, rule: number) {
        _assertPlatformerSprite(sprite);

        const state = getStateForSprite(sprite as PlatformerSprite, false);
        state.clearAnimationsForRule(rule);
    }


    /**
     * Enable or disable all rule animations on the specified sprite.
     * This is useful for temporarily turning off animations while
     * another animation plays (e.g. an attack animation)
     *
     * @param sprite    The sprite to enable/disable animations on
     * @param enabled   True to enable, false to disable
     */
    //% blockId=arcade_mp_character_animation_enabled
    //% block="$sprite enable character animations $enabled"
    //% sprite.defl=mySprite
    //% sprite.shadow=variables_get
    //% weight=50
    //% blockGap=8
    //% group="Animations"
    export function setCharacterAnimationsEnabled(sprite: Sprite, enabled: boolean) {
        _assertPlatformerSprite(sprite);

        const state = getStateForSprite(sprite as PlatformerSprite, false);
        if (!state) return;

        state.setEnabled(enabled);
    }

    /**
     * Constructs a rule for checking the state of a sprite. Rules
     * with more clauses will override rules with fewer clauses. Invalid
     * rules (e.g. "moving left AND moving right") are ignored.
     */
    //% blockId=arcade_mp_character_make_rule
    //% block="$p1||and $p2 and $p3 and $p4 and $p5"
    //% inlineInputMode=inline
    //% p1.shadow=platformer_state
    //% p2.shadow=platformer_state
    //% p3.shadow=platformer_state
    //% p4.shadow=platformer_state
    //% p5.shadow=platformer_state
    //% weight=40
    //% blockGap=8
    //% group="Animations"
    export function rule(p1: number, p2?: number, p3?: number, p4?: number, p5?: number): number {
        let rule = p1;
        if (p2) rule |= p2;
        if (p3) rule |= p3;
        if (p4) rule |= p4;
        if (p5) rule |= p5;

        return rule;
    }

    function getStateForSprite(sprite: PlatformerSprite, createIfNotFound: boolean) {
        if (!sprite) return undefined;

        const sceneState = _state().animations;
        for (const state of sceneState.characters) {
            if (state.sprite === sprite) {
                return state;
            }
        }

        if (createIfNotFound) {
            const newState = new CharacterState(sprite);
            sceneState.characters.push(newState);
            return newState;
        }
        return undefined;
    }
}