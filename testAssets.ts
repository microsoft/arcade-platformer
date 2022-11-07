namespace myTiles {
    export const transparency16 = img`
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . .`;
    export const tile1 = img`
    c c c c c c c c c c c c c c c c
    c c c c c c c c c c c c c c c c
    c c c c c c c c c c c c c c c c
    c c c c c c c c c c c c c c c c
    c c c c c c c c c c c c c c c c
    c c c c c c c c c c c c c c c c
    c c c c c c c c c c c c c c c c
    c c c c c c c c c c c c c c c c
    c c c c c c c c c c c c c c c c
    c c c c c c c c c c c c c c c c
    c c c c c c c c c c c c c c c c
    c c c c c c c c c c c c c c c c
    c c c c c c c c c c c c c c c c
    c c c c c c c c c c c c c c c c
    c c c c c c c c c c c c c c c c
    c c c c c c c c c c c c c c c c`
    export const tile2 = img`
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1`

    helpers._registerFactory("tilemap", function (name: string) {
        switch (helpers.stringTrim(name)) {
            case "level1":
            case "level1": return tiles.createTilemap(hex`100008000101010101010101010101010101010201010101010101010101010101010102010101010101010202010102020101020101010101010101010101020201010201010101020201010101010202010102010101010101010101010101010101020101010101010101010101010101010202020202020202020202020202020202`, img`
. . . . . . . . . . . . . . . 2
. . . . . . . . . . . . . . . 2
. . . . . . . 2 2 . . 2 2 . . 2
. . . . . . . . . . . 2 2 . . 2
. . . . 2 2 . . . . . 2 2 . . 2
. . . . . . . . . . . . . . . 2
. . . . . . . . . . . . . . . 2
2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2
`, [myTiles.transparency16, myTiles.tile1, myTiles.tile2], TileScale.Sixteen);
        }
        return null;
    })

    helpers._registerFactory("tile", function (name: string) {
        switch (helpers.stringTrim(name)) {
            case "transparency16": return transparency16;
            case "myTile":
            case "tile1": return tile1;
            case "myTile0":
            case "tile2": return tile2;
        }
        return null;
    })

}