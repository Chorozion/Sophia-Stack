// wordlist.mjs — simple, distinct words for a human-friendly recovery string.
// Five random words (per-site, shown once) = the recovery string. With scrypt
// hashing + a remote endpoint, this word-space is infeasible to brute-force.
export const WORDS = [
  "amber", "anchor", "apple", "arrow", "atlas", "aurora", "autumn", "bacon", "badge", "bamboo",
  "banana", "basket", "beacon", "bean", "bear", "beetle", "bell", "birch", "bishop", "bison",
  "blanket", "blossom", "boulder", "branch", "brass", "bread", "breeze", "bridge", "bronze", "brook",
  "bubble", "bucket", "buffalo", "button", "cabin", "cactus", "candle", "canoe", "canvas", "canyon",
  "cargo", "carrot", "castle", "cedar", "cellar", "cherry", "chimney", "cliff", "cloud", "clover",
  "coast", "cobalt", "comet", "copper", "coral", "cotton", "cougar", "cricket", "crimson", "crystal",
  "dahlia", "daisy", "dawn", "delta", "denim", "desert", "diamond", "dolphin", "dragon", "dune",
  "eagle", "ember", "emerald", "engine", "falcon", "fern", "ferry", "fiber", "field", "fjord",
  "flame", "flint", "forest", "fossil", "fountain", "fox", "galaxy", "garden", "ginger", "glacier",
  "granite", "grape", "gravel", "harbor", "hawk", "hazel", "heron", "hickory", "honey", "horizon",
  "ice", "indigo", "iris", "island", "ivory", "jade", "jasmine", "jelly", "jungle", "kayak",
  "kettle", "kiwi", "koala", "lagoon", "lantern", "lava", "ledger", "lemon", "lily", "linen",
  "lion", "lotus", "lumber", "maple", "marble", "meadow", "melon", "meteor", "mint", "mirror",
  "moss", "mountain", "muffin", "nebula", "nectar", "needle", "nickel", "noble", "north", "oak",
  "ocean", "olive", "onyx", "opal", "orbit", "otter", "oyster", "palm", "panda", "pebble",
  "pepper", "petal", "pewter", "pigeon", "pine", "planet", "plum", "pond", "poppy", "prairie",
  "puzzle", "quartz", "quiver", "rabbit", "raccoon", "raft", "rain", "raven", "reef", "ribbon",
  "river", "robin", "rocket", "rose", "ruby", "saddle", "sage", "salmon", "sand", "sapphire",
  "scarlet", "shadow", "shell", "silver", "slate", "snow", "spark", "sparrow", "spruce", "stone",
  "storm", "summit", "sunset", "table", "talon", "thunder", "tiger", "timber", "topaz", "trail",
  "tulip", "tundra", "turtle", "valley", "velvet", "violet", "walnut", "willow", "window", "winter",
  "wolf", "wren", "zebra", "zephyr",
];
