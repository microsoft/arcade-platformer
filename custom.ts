namespace platformer {
    export enum PlatformerFlags {
        ControlsEnabled = 1 << 0,
        InputLastFrame = 1 << 1,
        JumpOnAPressed = 1 << 2,
        JumpOnUpPressed = 1 << 3,
        AllowJumpCancellation = 1 << 4,
        CurrentlyJumping = 1 << 5,
        JumpStartedWithA = 1 << 6,
        CoyoteTime = 1 << 7,
        MovementMomentum = 1 << 8,
        WallJumps = 1 << 9,
    }

    class PlatformerConstants {
        values: number[];

        constructor(public parent?: PlatformerConstants) {
            this.values = [];
        }

        setValue(constant: PlatformerConstant, value: number) {
            while (this.values.length < constant) {
                this.values.push(undefined);
            }
            this.values[constant] = value;
        }

        lookupValue(constant: PlatformerConstant): number {
            if (this.values[constant] === undefined) {
                return this.parent.lookupValue(constant);
            }
            return this.values[constant];
        }
    }

    function createDefaultConstants() {
        const res = new PlatformerConstants();
        res.setValue(PlatformerConstant.JumpGracePeriodMillis, 100)
        res.setValue(PlatformerConstant.CoyoteTimeMillis, 100)
        res.setValue(PlatformerConstant.MoveSpeed, 60)
        res.setValue(PlatformerConstant.MaxJumpHeight, 40)
        res.setValue(PlatformerConstant.MomentumAcceleration, 700)
        res.setValue(PlatformerConstant.WallJumpHeight, 30)
        res.setValue(PlatformerConstant.WallJumpKickoffVelocity, 100)
        res.setValue(PlatformerConstant.WallFriction, 500)
        res.setValue(PlatformerConstant.WallMinVelocity, 50)
        return res;
    }

    const globalConstants = createDefaultConstants();

    export class PlatformerSprite extends Sprite {
        pFlags: number;
        sFlags: number;
        jumpStartTime: number;
        lastOnGroundTime: number;
        lastOnWallTime: number;
        player: controller.Controller;

        constants: PlatformerConstants;

        constructor(img: Image) {
            super(img);

            this.setGravity(_state().gravity, _state().gravityDirection);
            _state().allSprites.push(this);
            this.pFlags = _state().templateFlags;
            this.constants = new PlatformerConstants(globalConstants);
            this.setStateFlag(PlatformerSpriteState.FacingRight, true);
        }

        setPlatformerFlag(flag: number, enabled: boolean) {
            if (enabled) this.pFlags |= flag;
            else this.pFlags &= ~flag;
        }

        setStateFlag(flag: number, enabled: boolean) {
            if (enabled) this.sFlags |= flag;
            else this.sFlags &= ~flag;
        }

        hasState(flag: number) {
            return !!(this.sFlags & flag);
        }

        timeToJumpApex() {
            const gravity = Math.abs(_state().gravity);
            return (1000 * Math.sqrt(2 * this.constants.lookupValue(PlatformerConstant.MaxJumpHeight) * gravity) / gravity) | 0;
        }

        setGravity(strength: number, direction: Direction) {
            switch (direction) {
                case Direction.Down:
                    this.ay = strength;
                    this.ax = 0;
                    break;
                case Direction.Up:
                    this.ay = -strength;
                    this.ax = 0;
                    break;
                case Direction.Right:
                    this.ay = 0;
                    this.ax = strength;
                    break;
                case Direction.Left:
                    this.ay = 0;
                    this.ax = -strength;
                    break;

            }
        }
    }

    let stateStack: PlatformerState[];

    class PlatformerState {
        templateFlags: number;
        gravity: number;
        gravityDirection: Direction;

        allSprites: PlatformerSprite[];

        upButtonTimer: number[];
        upButtonIsPressed: boolean[];
        aButtonTimer: number[];
        aButtonIsPressed: boolean[];

        constructor() {
            this.gravity = 500;
            this.gravityDirection = Direction.Down;

            this.allSprites = [];

            game.currentScene().eventContext.registerFrameHandler(scene.CONTROLLER_SPRITES_PRIORITY, () => {
                this.moveSprites();
            });

            this.upButtonTimer = [];
            this.upButtonIsPressed = [];
            this.aButtonTimer = [];
            this.aButtonIsPressed = [];

            for (let i = 0; i < controller.players().length; i++) {
                const ctrl = controller.players()[i];
                this.upButtonTimer.push(0);
                this.upButtonIsPressed.push(false);
                this.aButtonTimer.push(0);
                this.aButtonIsPressed.push(false);

                ctrl.A.addEventListener(ControllerButtonEvent.Pressed, () => {
                    this.aButtonIsPressed[i] = true;
                    this.aButtonTimer[i] = game.runtime();
                });

                ctrl.A.addEventListener(ControllerButtonEvent.Released, () => {
                    this.aButtonIsPressed[i] = false;
                });

                ctrl.up.addEventListener(ControllerButtonEvent.Pressed, () => {
                    this.upButtonIsPressed[i] = true;
                    this.upButtonTimer[i] = game.runtime();
                });

                ctrl.up.addEventListener(ControllerButtonEvent.Released, () => {
                    this.upButtonIsPressed[i] = false;
                });
            }

            this.setTemplateFlag(PlatformerFlags.AllowJumpCancellation, true)
            this.setTemplateFlag(PlatformerFlags.JumpOnAPressed, true)
            this.setTemplateFlag(PlatformerFlags.CoyoteTime, true)
            this.setTemplateFlag(PlatformerFlags.MovementMomentum, true)
            this.setTemplateFlag(PlatformerFlags.WallJumps, true)
        }

        setGravity(strength: number, direction: Direction) {
            this.gravityDirection = direction;
            this.gravity = strength;
            for (const sprite of this.allSprites) {
                sprite.setGravity(strength, direction);
            }
        }

        moveSprites() {
            let svx = 0
            let svy = 0

            const dtMs = control.eventContext().deltaTimeMillis;
            for (const sprite of this.allSprites) {
                let vx = 0;
                let vy = 0;

                if (sprite.pFlags & PlatformerFlags.ControlsEnabled) {
                    if (sprite.flags & sprites.Flag.Destroyed) {
                        continue;
                    }

                    const ctrl = sprite.player;

                    if (ctrl.analog) {
                        svx = (ctrl.right.pressureLevel() - ctrl.left.pressureLevel()) >> 1
                        svy = (ctrl.down.pressureLevel() - ctrl.up.pressureLevel()) >> 1
                    } else {
                        svx = (ctrl.right.isPressed() ? 256 : 0) - (ctrl.left.isPressed() ? 256 : 0)
                        svy = (ctrl.down.isPressed() ? 256 : 0) - (ctrl.up.isPressed() ? 256 : 0)
                    }

                    let svxInCricle = svx
                    let svyInCircle = svy

                    // here svx/y are -256 to 256 range
                    const sq = svx * svx + svy * svy
                    // we want to limit svx/y to be within circle of 256 radius
                    const max = 256 * 256
                    // is it outside the circle?
                    if (sq > max) {
                        // if so, store the vector scaled down to fit in the circle
                        const scale = Math.sqrt(max / sq)
                        svxInCricle = scale * svx | 0
                        svyInCircle = scale * svy | 0
                    }

                    if (sprite.pFlags & PlatformerFlags.MovementMomentum) {
                        if (this.gravityDirection === Direction.Up || this.gravityDirection === Direction.Down) {
                            vx = sprite.constants.lookupValue(PlatformerConstant.MoveSpeed);
                        }
                        else {
                            vy = sprite.constants.lookupValue(PlatformerConstant.MoveSpeed);
                        }

                        const acc = Fx8(sprite.constants.lookupValue(PlatformerConstant.MomentumAcceleration));
                        sprite.setStateFlag(PlatformerSpriteState.Turning, false);
                        sprite.setStateFlag(PlatformerSpriteState.Decelerating, false);
                        sprite.setStateFlag(PlatformerSpriteState.Accelerating, false);
                        sprite.setStateFlag(PlatformerSpriteState.MaxRunningSpeed, false);
                        if (svx || svy) {
                            if (vx) {
                                if (vx > 0 && sprite.vx > vx || vx < 0 && sprite.vx < vx) {
                                    const friction = Fx.idiv(
                                        Fx.imul(
                                            acc,
                                            dtMs
                                        ),
                                        1000
                                    );

                                    const c = Fx.compare(sprite._vx, Fx.zeroFx8);
                                    if (c < 0) { // v < f, v += f
                                        sprite.setStateFlag(PlatformerSpriteState.Decelerating, true);
                                        sprite._vx = Fx.min(Fx.zeroFx8, Fx.add(sprite._vx, friction));
                                    }
                                    else if (c > 0) { // v > f, v -= f
                                        sprite.setStateFlag(PlatformerSpriteState.Decelerating, true);
                                        sprite._vx = Fx.max(Fx.zeroFx8, Fx.sub(sprite._vx, friction));
                                    }
                                    else {
                                        sprite.setStateFlag(PlatformerSpriteState.Decelerating, false);
                                        sprite._vx = Fx.zeroFx8
                                    }

                                    sprite.setPlatformerFlag(PlatformerFlags.InputLastFrame, false);
                                }
                                else {
                                    sprite._vx = Fx.add(
                                        sprite._vx,
                                        Fx.idiv(
                                            Fx.imul(
                                                Fx.mul(svx as any as Fx8, acc),
                                                dtMs
                                            ),
                                            1000
                                        )
                                    );

                                    sprite.vx = Math.constrain(sprite.vx, -vx, vx);

                                    if (svx > 0) {
                                        sprite.setStateFlag(PlatformerSpriteState.MaxRunningSpeed, sprite.vx === vx);
                                    }
                                    else {
                                        sprite.setStateFlag(PlatformerSpriteState.MaxRunningSpeed, sprite.vx === -vx);
                                    }

                                    if (!sprite.hasState(PlatformerSpriteState.MaxRunningSpeed)) {
                                        if (Math.sign(sprite.vx) !== Math.sign(svx)) {
                                            sprite.setStateFlag(PlatformerSpriteState.Turning, true);
                                        }
                                        else {
                                            sprite.setStateFlag(PlatformerSpriteState.Accelerating, true);
                                        }
                                    }
                                }
                            } else if (vy) {
                                if (vy > 0 && sprite.vy > vy || vy < 0 && sprite.vy < vy) {
                                    const friction = Fx.idiv(
                                        Fx.imul(
                                            acc,
                                            dtMs
                                        ),
                                        1000
                                    );

                                    const c = Fx.compare(sprite._vy, Fx.zeroFx8);
                                    if (c < 0) { // v < f, v += f
                                        sprite.setStateFlag(PlatformerSpriteState.Decelerating, true);
                                        sprite._vy = Fx.min(Fx.zeroFx8, Fx.add(sprite._vy, friction));
                                    }
                                    else if (c > 0) { // v > f, v -= f
                                        sprite.setStateFlag(PlatformerSpriteState.Decelerating, true);
                                        sprite._vy = Fx.max(Fx.zeroFx8, Fx.sub(sprite._vy, friction));
                                    }
                                    else {
                                        sprite.setStateFlag(PlatformerSpriteState.Decelerating, false);
                                        sprite._vy = Fx.zeroFx8
                                    }

                                    sprite.setPlatformerFlag(PlatformerFlags.InputLastFrame, false);
                                }
                                else {
                                    sprite._vy = Fx.add(
                                        sprite._vy,
                                        Fx.idiv(
                                            Fx.imul(
                                                Fx.mul(svy as any as Fx8, acc),
                                                dtMs
                                            ),
                                            1000
                                        )
                                    );

                                    sprite.vy = Math.constrain(sprite.vy, -vy, vy);
                                }

                            }
                            sprite.setPlatformerFlag(PlatformerFlags.InputLastFrame, true);
                        }
                        else {
                            const friction = Fx.idiv(
                                Fx.imul(
                                    acc,
                                    dtMs
                                ),
                                1000
                            );

                            if (vx) {
                                const c = Fx.compare(sprite._vx, Fx.zeroFx8);
                                if (c < 0) { // v < f, v += f
                                    sprite.setStateFlag(PlatformerSpriteState.Decelerating, true);
                                    sprite._vx = Fx.min(Fx.zeroFx8, Fx.add(sprite._vx, friction));
                                }
                                else if (c > 0) { // v > f, v -= f
                                    sprite.setStateFlag(PlatformerSpriteState.Decelerating, true);
                                    sprite._vx = Fx.max(Fx.zeroFx8, Fx.sub(sprite._vx, friction));
                                }
                                else {
                                    sprite.setStateFlag(PlatformerSpriteState.Decelerating, false);
                                    sprite._vx = Fx.zeroFx8
                                }

                            } else if (vy) {
                                const c = Fx.compare(sprite._vy, Fx.zeroFx8);
                                if (c < 0) { // v < f, v += f
                                    sprite.setStateFlag(PlatformerSpriteState.Decelerating, true);
                                    sprite._vy = Fx.min(Fx.zeroFx8, Fx.add(sprite._vy, friction));
                                }
                                else if (c > 0) { // v > f, v -= f
                                    sprite.setStateFlag(PlatformerSpriteState.Decelerating, true);
                                    sprite._vy = Fx.max(Fx.zeroFx8, Fx.sub(sprite._vy, friction));
                                }
                                else {
                                    sprite.setStateFlag(PlatformerSpriteState.Decelerating, false);
                                    sprite._vy = Fx.zeroFx8
                                }
                            }
                            sprite.setPlatformerFlag(PlatformerFlags.InputLastFrame, false);
                        }
                    }
                    else {
                        if (this.gravityDirection === Direction.Up || this.gravityDirection === Direction.Down) {
                            vx = sprite.constants.lookupValue(PlatformerConstant.MoveSpeed);
                        }
                        else {
                            vy = sprite.constants.lookupValue(PlatformerConstant.MoveSpeed);
                        }

                        if (sprite.pFlags & PlatformerFlags.InputLastFrame) {
                            if (vx) sprite._vx = Fx.zeroFx8;
                            if (vy) sprite._vy = Fx.zeroFx8;
                        }

                        if (svx || svy) {
                            if (vx) {
                                sprite._vx = Fx.imul(svx as any as Fx8, vx)
                            } else if (vy) {
                                sprite._vy = Fx.imul(svy as any as Fx8, vy)
                            }
                            sprite.setPlatformerFlag(PlatformerFlags.InputLastFrame, true);
                        }
                        else {
                            sprite.setPlatformerFlag(PlatformerFlags.InputLastFrame, false);
                        }
                    }
                }

                let movingLaterally = false;
                let movingLeft = false;
                switch (this.gravityDirection) {
                    case Direction.Down:
                    case Direction.Up:
                        if (sprite.vx > 0 && sprite.isHittingTile(CollisionDirection.Right)) {
                            movingLaterally = false;
                            movingLeft = false;
                        }
                        else if (sprite.vx < 0 && sprite.isHittingTile(CollisionDirection.Left)) {
                            movingLaterally = false;
                            movingLeft = true;
                        }
                        else if (sprite.vx) {
                            movingLaterally = true;
                            movingLeft = sprite.vx < 0;
                        }
                        break;
                    case Direction.Right:
                    case Direction.Left:
                        if (sprite.vy > 0 && sprite.isHittingTile(CollisionDirection.Bottom)) {
                            movingLaterally = false;
                            movingLeft = false;
                        }
                        else if (sprite.vy < 0 && sprite.isHittingTile(CollisionDirection.Top)) {
                            movingLaterally = false;
                            movingLeft = true;
                        }
                        else if (sprite.vy) {
                            movingLaterally = true;
                            movingLeft = sprite.vy < 0;
                        }
                        break;

                }

                if (sprite.pFlags & PlatformerFlags.InputLastFrame) {
                    sprite.setStateFlag(PlatformerSpriteState.FacingLeft, movingLeft);
                    sprite.setStateFlag(PlatformerSpriteState.FacingRight, !movingLeft);
                }

                sprite.setStateFlag(PlatformerSpriteState.Moving, movingLaterally)
            }

            this.handleJumping();
        }

        handleJumping() {
            const currentTime = game.runtime();

            let onGround = false;
            let onWall = false;
            for (const sprite of this.allSprites) {
                onGround = isOnGround(sprite, this.gravityDirection);
                onWall = isOnWall(sprite, this.gravityDirection);

                if (onGround) {
                    sprite.lastOnGroundTime = game.runtime();
                    sprite.setStateFlag(PlatformerSpriteState.AfterJumpApex, false);
                    sprite.setStateFlag(PlatformerSpriteState.Falling, false);
                }
                else if (!sprite.hasState(PlatformerSpriteState.AfterJumpApex) && !sprite.hasState(PlatformerSpriteState.JumpingUp)) {
                    sprite.setStateFlag(PlatformerSpriteState.Falling, true)
                }

                sprite.setStateFlag(PlatformerSpriteState.OnGround, onGround);

                if (onWall) {
                    sprite.lastOnWallTime = game.runtime();
                }
                else {
                    sprite.setGravity(_state().gravity, _state().gravityDirection);
                    sprite.setStateFlag(PlatformerSpriteState.OnWallRight, false);
                    sprite.setStateFlag(PlatformerSpriteState.OnWallLeft, false);
                    sprite.setStateFlag(PlatformerSpriteState.WallSliding, false);
                }

                const pIndex = sprite.player.playerIndex;

                if (onGround || ((sprite.pFlags & PlatformerFlags.CoyoteTime) && game.runtime() - sprite.lastOnGroundTime < sprite.constants.lookupValue(PlatformerConstant.CoyoteTimeMillis))) {
                    sprite.setPlatformerFlag(PlatformerFlags.CurrentlyJumping, false);
                    sprite.setStateFlag(PlatformerSpriteState.JumpingUp, false);

                    if (sprite.jumpStartTime === undefined || currentTime - sprite.jumpStartTime > sprite.constants.lookupValue(PlatformerConstant.JumpGracePeriodMillis)) {
                        if (sprite.pFlags & PlatformerFlags.JumpOnAPressed && sprite.pFlags & PlatformerFlags.ControlsEnabled) {
                            if (currentTime - this.aButtonTimer[pIndex] < sprite.constants.lookupValue(PlatformerConstant.JumpGracePeriodMillis)) {
                                startJump(sprite, this.gravity, this.gravityDirection, sprite.constants.lookupValue(PlatformerConstant.MaxJumpHeight));
                                sprite.setPlatformerFlag(PlatformerFlags.JumpStartedWithA, true);
                            }
                        }
                        if (sprite.pFlags & PlatformerFlags.JumpOnUpPressed && sprite.pFlags & PlatformerFlags.ControlsEnabled) {
                            if (currentTime - this.upButtonTimer[pIndex] < sprite.constants.lookupValue(PlatformerConstant.JumpGracePeriodMillis)) {
                                startJump(sprite, this.gravity, this.gravityDirection, sprite.constants.lookupValue(PlatformerConstant.MaxJumpHeight));
                                sprite.setPlatformerFlag(PlatformerFlags.JumpStartedWithA, false);
                            }
                        }
                    }
                }
                else if (sprite.pFlags & PlatformerFlags.CurrentlyJumping) {
                    if (currentTime - sprite.jumpStartTime > sprite.timeToJumpApex()) {
                        sprite.setPlatformerFlag(PlatformerFlags.CurrentlyJumping, false)
                        sprite.setStateFlag(PlatformerSpriteState.JumpingUp, false);
                        sprite.setStateFlag(PlatformerSpriteState.AfterJumpApex, true);
                    }

                    if (sprite.pFlags & PlatformerFlags.AllowJumpCancellation) {
                        if (sprite.pFlags & PlatformerFlags.JumpOnAPressed && !this.aButtonIsPressed[pIndex] && sprite.pFlags & PlatformerFlags.JumpStartedWithA) {
                            cancelJump(sprite, this.gravityDirection);
                        }
                        if (sprite.pFlags & PlatformerFlags.JumpOnUpPressed && !this.upButtonIsPressed[pIndex] && !(sprite.pFlags & PlatformerFlags.JumpStartedWithA)) {
                            cancelJump(sprite, this.gravityDirection);
                        }
                    }
                }

                let didWallJump = false;
                if (onWall || ((sprite.pFlags & PlatformerFlags.CoyoteTime) && game.runtime() - sprite.lastOnWallTime < sprite.constants.lookupValue(PlatformerConstant.CoyoteTimeMillis))) {
                    if (sprite.jumpStartTime === undefined || currentTime - sprite.jumpStartTime > sprite.constants.lookupValue(PlatformerConstant.JumpGracePeriodMillis)) {
                        if (sprite.pFlags & PlatformerFlags.JumpOnAPressed && sprite.pFlags & PlatformerFlags.ControlsEnabled) {
                            if (currentTime - this.aButtonTimer[pIndex] < sprite.constants.lookupValue(PlatformerConstant.JumpGracePeriodMillis)) {
                                startJump(sprite, this.gravity, this.gravityDirection, sprite.constants.lookupValue(PlatformerConstant.WallJumpHeight), sprite.constants.lookupValue(PlatformerConstant.WallJumpKickoffVelocity));
                                sprite.setPlatformerFlag(PlatformerFlags.JumpStartedWithA, true);
                                didWallJump = true;
                            }
                        }
                        if (sprite.pFlags & PlatformerFlags.JumpOnUpPressed && sprite.pFlags & PlatformerFlags.ControlsEnabled) {
                            if (currentTime - this.upButtonTimer[pIndex] < sprite.constants.lookupValue(PlatformerConstant.JumpGracePeriodMillis)) {
                                startJump(sprite, this.gravity, this.gravityDirection, sprite.constants.lookupValue(PlatformerConstant.WallJumpHeight), sprite.constants.lookupValue(PlatformerConstant.WallJumpKickoffVelocity));
                                sprite.setPlatformerFlag(PlatformerFlags.JumpStartedWithA, false);
                                didWallJump = true;
                            }
                        }
                    }
                    sprite.setPlatformerFlag(PlatformerFlags.CurrentlyJumping, false);
                }

                // Wall friction
                if (onWall && !didWallJump) {
                    const friction = Fx8(sprite.constants.lookupValue(PlatformerConstant.WallFriction));
                    const minVelocity = Fx8(sprite.constants.lookupValue(PlatformerConstant.WallMinVelocity) || 0);

                    let shouldApplyFriction = false;

                    switch (_state().gravityDirection) {
                        case Direction.Down:
                            shouldApplyFriction = Fx.compare(sprite._vy, Fx.zeroFx8) > 0;
                            break;
                        case Direction.Up:
                            shouldApplyFriction = Fx.compare(sprite._vy, Fx.zeroFx8) < 0;
                            break;
                        case Direction.Left:
                            shouldApplyFriction = Fx.compare(sprite._vx, Fx.zeroFx8) < 0;
                            break;
                        case Direction.Right:
                            shouldApplyFriction = Fx.compare(sprite._vx, Fx.zeroFx8) > 0;
                            break;
                    }

                    sprite.setStateFlag(PlatformerSpriteState.WallSliding, shouldApplyFriction);
                    if (shouldApplyFriction) {
                        switch (_state().gravityDirection) {
                            case Direction.Down:
                            case Direction.Up:
                                sprite.setStateFlag(PlatformerSpriteState.OnWallRight, sprite.isHittingTile(CollisionDirection.Right))
                                sprite.setStateFlag(PlatformerSpriteState.OnWallLeft, sprite.isHittingTile(CollisionDirection.Left))

                                const c1 = Fx.compare(sprite._vy, friction);
                                if (c1 < 0) // v < f, v += f
                                    sprite._vy = Fx.min(Fx.zeroFx8, Fx.add(sprite._vy, friction));
                                else if (c1 > 0) // v > f, v -= f
                                    sprite._vy = Fx.max(Fx.zeroFx8, Fx.sub(sprite._vy, friction));
                                else
                                    sprite._vy = Fx.zeroFx8

                                if (Fx.compare(Fx.abs(sprite._vy), minVelocity) < 0) {
                                    if (Fx.compare(sprite._vy, Fx.zeroFx8) < 0) {
                                        sprite._vy = Fx.neg(minVelocity);
                                    }
                                    else {
                                        sprite._vy = minVelocity
                                    }
                                }
                                sprite.ay = 0;
                                break;
                            case Direction.Left:
                            case Direction.Right:
                                sprite.setStateFlag(PlatformerSpriteState.OnWallRight, sprite.isHittingTile(CollisionDirection.Bottom))
                                sprite.setStateFlag(PlatformerSpriteState.OnWallLeft, sprite.isHittingTile(CollisionDirection.Top))

                                const c2 = Fx.compare(sprite._vx, friction);
                                if (c2 < 0) // v < f, v += f
                                    sprite._vx = Fx.min(Fx.zeroFx8, Fx.add(sprite._vx, friction));
                                else if (c2 > 0) // v > f, v -= f
                                    sprite._vx = Fx.max(Fx.zeroFx8, Fx.sub(sprite._vx, friction));
                                else
                                    sprite._vx = Fx.zeroFx8

                                if (Fx.compare(Fx.abs(sprite._vx), minVelocity) < 0) {
                                    if (Fx.compare(sprite._vx, Fx.zeroFx8) < 0) {
                                        sprite._vx = Fx.neg(minVelocity);
                                    }
                                    else {
                                        sprite._vx = minVelocity
                                    }
                                }
                                sprite.ax = 0;
                                break;
                        }
                    }
                }
                else {
                    sprite.setStateFlag(PlatformerSpriteState.WallSliding, false);
                }

                if (onGround) {
                    switch (this.gravityDirection) {
                        case Direction.Down:
                        case Direction.Up:
                            sprite.setStateFlag(PlatformerSpriteState.PushingWallLeft, sprite.isHittingTile(CollisionDirection.Left));
                            sprite.setStateFlag(PlatformerSpriteState.PushingWallRight, sprite.isHittingTile(CollisionDirection.Right));
                            break;
                        case Direction.Right:
                        case Direction.Left:
                            sprite.setStateFlag(PlatformerSpriteState.PushingWallLeft, sprite.isHittingTile(CollisionDirection.Bottom));
                            sprite.setStateFlag(PlatformerSpriteState.PushingWallRight, sprite.isHittingTile(CollisionDirection.Top));
                            break;
                    }
                }

                switch (this.gravityDirection) {
                    case Direction.Down:
                    case Direction.Up:
                        if (sprite.vx > 0 && sprite.isHittingTile(CollisionDirection.Right)) {
                            sprite.setStateFlag(PlatformerSpriteState.Accelerating, false);
                        }
                        else if (sprite.vx < 0 && sprite.isHittingTile(CollisionDirection.Left)) {
                            sprite.setStateFlag(PlatformerSpriteState.Accelerating, false);
                        }
                        break;
                    case Direction.Right:
                    case Direction.Left:
                        if (sprite.vy > 0 && sprite.isHittingTile(CollisionDirection.Bottom)) {
                            sprite.setStateFlag(PlatformerSpriteState.Accelerating, false);
                        }
                        else if (sprite.vy < 0 && sprite.isHittingTile(CollisionDirection.Top)) {
                            sprite.setStateFlag(PlatformerSpriteState.Accelerating, false);
                        }
                        break;
                }
            }
        }

        setTemplateFlag(flag: number, enabled: boolean) {
            if (enabled) this.templateFlags |= flag;
            else this.templateFlags &= ~flag;

            for (const sprite of this.allSprites) {
                sprite.setPlatformerFlag(flag, enabled);
            }
        }

        setGlobalConstant(constant: PlatformerConstant, value: number) {
            globalConstants.setValue(constant, value);
        }
    }

    function startJump(sprite: PlatformerSprite, gravityStr: number, gravityDir: Direction, jumpHeight: number, kickoffVelocity = 0) {
        switch (gravityDir) {
            case Direction.Down:
                sprite.vy = -Math.sqrt(2 * gravityStr * jumpHeight);
                if (kickoffVelocity) {
                    if (sprite.isHittingTile(CollisionDirection.Left)) {
                        sprite.vx = kickoffVelocity;
                    }
                    else if (sprite.isHittingTile(CollisionDirection.Right)) {
                        sprite.vx = -kickoffVelocity;
                    }
                }
                break;
            case Direction.Up:
                sprite.vy = Math.sqrt(2 * gravityStr * jumpHeight);
                if (kickoffVelocity) {
                    if (sprite.isHittingTile(CollisionDirection.Left)) {
                        sprite.vx = kickoffVelocity;
                    }
                    else if (sprite.isHittingTile(CollisionDirection.Right)) {
                        sprite.vx = -kickoffVelocity;
                    }
                }
                break;
            case Direction.Right:
                sprite.vx = -Math.sqrt(2 * gravityStr * jumpHeight);
                if (kickoffVelocity) {
                    if (sprite.isHittingTile(CollisionDirection.Top)) {
                        sprite.vy = kickoffVelocity;
                    }
                    else if (sprite.isHittingTile(CollisionDirection.Bottom)) {
                        sprite.vy = -kickoffVelocity;
                    }
                }
                break;
            case Direction.Left:
                sprite.vx = Math.sqrt(2 * gravityStr * jumpHeight);
                if (kickoffVelocity) {
                    if (sprite.isHittingTile(CollisionDirection.Top)) {
                        sprite.vy = kickoffVelocity;
                    }
                    else if (sprite.isHittingTile(CollisionDirection.Bottom)) {
                        sprite.vy = -kickoffVelocity;
                    }
                }
                break;
        }

        sprite.setPlatformerFlag(PlatformerFlags.CurrentlyJumping, true);
        sprite.setStateFlag(PlatformerSpriteState.JumpingUp, true);
        sprite.jumpStartTime = game.runtime();
        sprite.lastOnGroundTime = - sprite.constants.lookupValue(PlatformerConstant.CoyoteTimeMillis)
    }

    function cancelJump(sprite: PlatformerSprite, gravityDir: Direction) {
        switch (gravityDir) {
            case Direction.Down:
                sprite.vy = 0
                break;
            case Direction.Up:
                sprite.vy = 0
                break;
            case Direction.Right:
                sprite.vx = 0
                break;
            case Direction.Left:
                sprite.vx = 0
                break;
        }

        sprite.setPlatformerFlag(PlatformerFlags.CurrentlyJumping, false);
        sprite.setStateFlag(PlatformerSpriteState.JumpingUp, false);
        sprite.setStateFlag(PlatformerSpriteState.AfterJumpApex, true);
    }

    function isOnGround(sprite: Sprite, gravityDir: Direction) {
        switch (gravityDir) {
            case Direction.Down:
                return sprite.isHittingTile(CollisionDirection.Bottom);
            case Direction.Up:
                return sprite.isHittingTile(CollisionDirection.Top);
            case Direction.Right:
                return sprite.isHittingTile(CollisionDirection.Right);
            case Direction.Left:
                return sprite.isHittingTile(CollisionDirection.Left);
        }
    }

    function isOnWall(sprite: Sprite, gravityDir: Direction) {
        if (isOnGround(sprite, gravityDir)) return false;
        switch (gravityDir) {
            case Direction.Down:
            case Direction.Up:
                return sprite.isHittingTile(CollisionDirection.Left) || sprite.isHittingTile(CollisionDirection.Right);
            case Direction.Right:
            case Direction.Left:
                return sprite.isHittingTile(CollisionDirection.Top) || sprite.isHittingTile(CollisionDirection.Bottom);
        }
    }

    function init() {
        if (stateStack) return;
        stateStack = [new PlatformerState()];

        game.addScenePushHandler(() => {
            stateStack.push(new PlatformerState());
        });

        game.addScenePopHandler(() => {
            stateStack.pop();

            if (stateStack.length === 0) {
                stateStack.push(new PlatformerState());
            }
        });
    }

    export function _state() {
        init();
        return stateStack[stateStack.length - 1];
    }
}
