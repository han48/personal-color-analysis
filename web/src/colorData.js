/**
 * colorData.js
 * Full palette, makeup, hair & clothing data for all 16 sub-seasons.
 * Imported by app.js – no backend needed.
 */

export const COLOR_DATA = {
  // ───────────────────────── SPRING ─────────────────────────────────────────
  Spring_Light: {
    label: "Spring Light (Nhẹ nhàng, Tươi sáng)",
    season: "Spring",
    description:
      "Tông ấm nhẹ, da sáng hồng đào, tóc vàng sáng hoặc nâu vàng. Màu tốt nhất là pastel ấm, peach, ivory.",
    palette: ["#FFF0D6","#FFD59E","#FFAB76","#FF8C69","#F4A460","#DEB887","#FFE4B5","#FFDAB9",
              "#FFC8A2","#FFB08A","#FAFAD2","#FFFACD"],
    colorGroups: {
      "Warm Neutrals": ["#FFF0D6","#FFE4B5","#FFDAB9","#FAFAD2"],
      "Peach & Coral":  ["#FFAB76","#FF8C69","#FFC8A2","#FFB08A"],
      "Golden & Honey": ["#FFD59E","#F4A460","#DEB887"],
    },
    recommendedHairColors: [
      { name: "Vàng Mật Ong",   hex: "#C9A96E" },
      { name: "Nâu Vàng Sáng",  hex: "#D4A96A" },
      { name: "Vàng Ánh Sáng",  hex: "#DAA520" },
      { name: "Nâu Cát",        hex: "#CD853F" },
      { name: "Vàng Cánh Gián", hex: "#B8860B" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Peach Coral", hex: "#FF9A7A" }, { name: "Cam Nhạt",    hex: "#FFB347" },
                  { name: "Coral",       hex: "#FF7F50" }, { name: "Salmon",       hex: "#FA8072" }],
      blush:     [{ name: "Peach Blush", hex: "#FFB6A3" }, { name: "Champagne",   hex: "#FFDAB9" },
                  { name: "Salmon Blush",hex: "#FFA07A" }],
      eyeshadow: [{ name: "Champagne",   hex: "#D2B48C" }, { name: "Sand",        hex: "#DEB887" },
                  { name: "Golden Tan",  hex: "#F4A460" }, { name: "Warm Wheat",  hex: "#FFDEAD" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Ivory Trắng Ngà",   hex: "#FFFFF0" },
        { name: "Peach Đào Nhạt",    hex: "#FFCBA4" },
        { name: "Coral Cam Nhạt",    hex: "#FF9B80" },
        { name: "Vàng Kem",          hex: "#FFF5CC" },
        { name: "Xanh Mint Ấm",      hex: "#C8F0D0" },
        { name: "Cam Mơ",            hex: "#FFB380" },
      ],
      bottoms: [
        { name: "Caramel Nâu",       hex: "#C07840" },
        { name: "Be Nâu Nhạt",       hex: "#E8C89A" },
        { name: "Kem Sữa",           hex: "#FDF0DC" },
        { name: "Nâu Mật Ong",       hex: "#B8860B" },
        { name: "Cam Đất Nhạt",      hex: "#D2946B" },
      ],
      avoid: [
        { name: "Đen Thuần",         hex: "#000000" },
        { name: "Xám Lạnh",          hex: "#808090" },
        { name: "Nâu Sô Cô La",     hex: "#3D1C02" },
        { name: "Tím Lạnh",          hex: "#6A0DAD" },
      ],
    },
  },

  Spring_Warm: {
    label: "Spring Warm (Ấm áp, Rực rỡ)",
    season: "Spring",
    description:
      "Da ấm ánh vàng, tóc nâu đỏ đồng hoặc vàng đậm. Màu tốt nhất là cam, vàng, san hô.",
    palette: ["#FFE4C4","#FFDEAD","#FFA500","#FF8C00","#FF7043","#FF6347","#FFD700","#FFC300",
              "#FF9933","#FF6600","#FFCC00","#FF8533"],
    colorGroups: {
      "Warm Oranges": ["#FFA500","#FF8C00","#FF9933","#FF6600"],
      "Coral & Red":  ["#FF7043","#FF6347","#FF8533"],
      "Gold & Yellow":["#FFD700","#FFC300","#FFCC00"],
    },
    recommendedHairColors: [
      { name: "Nâu Đồng",    hex: "#B8860B" },
      { name: "Nâu Hạt Dẻ", hex: "#CD853F" },
      { name: "Đỏ Đồng",    hex: "#8B4513" },
      { name: "Nâu Đất",    hex: "#A0522D" },
      { name: "Nâu Caramel",hex: "#D2691E" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Cam Đỏ",   hex: "#FF6347" }, { name: "Đỏ Cam",      hex: "#FF4500" },
                  { name: "Đỏ Gạch",  hex: "#E25822" }, { name: "Đồng Cam",    hex: "#CC5500" }],
      blush:     [{ name: "Coral",    hex: "#FF7F50" }, { name: "Cam Nhạt",    hex: "#FFA07A" },
                  { name: "Salmon",   hex: "#FA8072" }],
      eyeshadow: [{ name: "Vàng Kim", hex: "#DAA520" }, { name: "Đồng",        hex: "#B8860B" },
                  { name: "Nâu Hổ Phách", hex: "#CD853F" }, { name: "Nâu Vàng",hex: "#8B6914" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Cam Cháy",          hex: "#FF4500" },
        { name: "Vàng Nghệ",         hex: "#FFA500" },
        { name: "Đỏ Cam",            hex: "#FF6600" },
        { name: "Vàng Kim",          hex: "#FFD700" },
        { name: "Nâu Caramel",       hex: "#D2691E" },
        { name: "Kem Vàng Ấm",       hex: "#FFF0C0" },
      ],
      bottoms: [
        { name: "Nâu Cà Phê",        hex: "#6B3A2A" },
        { name: "Đen Nâu",           hex: "#3B1A08" },
        { name: "Kaki Vàng",         hex: "#C8A870" },
        { name: "Nâu Đất",           hex: "#8B4513" },
        { name: "Kem Vàng",          hex: "#E8D080" },
      ],
      avoid: [
        { name: "Xanh Lạnh",         hex: "#0000FF" },
        { name: "Hồng Lạnh",         hex: "#FF69B4" },
        { name: "Bạc Lạnh",          hex: "#C0C0C0" },
        { name: "Trắng Thuần Lạnh",  hex: "#F5F5FF" },
      ],
    },
  },

  Spring_Clear: {
    label: "Spring Clear (Trong sáng, Tươi)",
    season: "Spring",
    description:
      "Da sáng hồng trong, contrast vừa phải. Màu tốt nhất là trong sáng, vàng chanh, xanh ngọc nhẹ.",
    palette: ["#FFF9E6","#FFD700","#FF8C69","#FF6B6B","#00CED1","#40E0D0","#98FF98","#7FFFD4",
              "#FFFF99","#FF9999","#99FFCC","#80FFEE"],
    colorGroups: {
      "Bright Warm":  ["#FFD700","#FF8C69","#FFFF99"],
      "Clear Cool":   ["#00CED1","#40E0D0","#80FFEE"],
      "Fresh Green":  ["#98FF98","#7FFFD4","#99FFCC"],
    },
    recommendedHairColors: [
      { name: "Vàng Sánh",   hex: "#DAA520" },
      { name: "Nâu Vàng",    hex: "#C9A96E" },
      { name: "Honey Blond", hex: "#B8860B" },
      { name: "Vàng Chanh",  hex: "#FFD700" },
      { name: "Nâu Cát",     hex: "#DEB887" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Đỏ Tươi",     hex: "#FF6B6B" }, { name: "Đỏ Sáng",    hex: "#FF4F4F" },
                  { name: "Hồng San Hô", hex: "#FF7F7F" }, { name: "Hồng Hot",    hex: "#FF69B4" }],
      blush:     [{ name: "Hồng Nhạt",  hex: "#FFB6C1" }, { name: "Hồng Đào",    hex: "#FF9AA2" },
                  { name: "Hồng Baby",  hex: "#FFD1DC" }],
      eyeshadow: [{ name: "Xanh Mint",  hex: "#98FF98" }, { name: "Xanh Lá",     hex: "#90EE90" },
                  { name: "Turquoise",  hex: "#40E0D0" }, { name: "Xanh Da Trời",hex: "#87CEEB" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Turquoise Trong",   hex: "#40E0D0" },
        { name: "Vàng Chanh",        hex: "#FFD700" },
        { name: "Hồng San Hô",       hex: "#FF9B80" },
        { name: "Xanh Aqua",         hex: "#00CED1" },
        { name: "Xanh Mint",         hex: "#AAF0D1" },
        { name: "Trắng Sữa Ấm",      hex: "#FFFAF0" },
      ],
      bottoms: [
        { name: "Trắng Kem",         hex: "#FFFDE7" },
        { name: "Xanh Nhạt",         hex: "#B0E8FF" },
        { name: "Vàng Nhạt",         hex: "#FFF3B0" },
        { name: "Kaki Sáng",         hex: "#E8D8A0" },
        { name: "Xanh Ngọc Nhạt",    hex: "#C0F0E8" },
      ],
      avoid: [
        { name: "Đen Tuyền",         hex: "#000000" },
        { name: "Xám Tối",           hex: "#505050" },
        { name: "Nâu Đậm",           hex: "#3B1A08" },
        { name: "Tím Đậm",           hex: "#4B0082" },
      ],
    },
  },

  Spring_Bright: {
    label: "Spring Bright (Rực rỡ, Nổi bật)",
    season: "Spring",
    description:
      "Da sáng, contrast cao, màu mắt và tóc rõ ràng. Màu tốt nhất là màu rực rỡ, sặc sỡ.",
    palette: ["#FFFF00","#FF6B35","#FF1493","#00FF7F","#00BFFF","#FF4500","#FF69B4","#ADFF2F",
              "#FF3399","#33FF33","#FF9900","#00CCFF"],
    colorGroups: {
      "Vibrant Warm":  ["#FFFF00","#FF6B35","#FF9900"],
      "Bright Pink":   ["#FF1493","#FF69B4","#FF3399"],
      "Fresh & Green": ["#00FF7F","#ADFF2F","#33FF33"],
    },
    recommendedHairColors: [
      { name: "Vàng Neon",   hex: "#FFD700" },
      { name: "Vàng Kim",    hex: "#DAA520" },
      { name: "Honey",       hex: "#C9A96E" },
      { name: "Cam Vàng",    hex: "#FFA500" },
      { name: "Nâu Cà Phê",  hex: "#FF8C00" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Hồng Neon",  hex: "#FF1493" }, { name: "Hồng Hot",    hex: "#FF69B4" },
                  { name: "Cam Neon",   hex: "#FF4500" }, { name: "Đỏ Cam",      hex: "#FF6347" }],
      blush:     [{ name: "Hot Pink",   hex: "#FF69B4" }, { name: "Hồng Nhạt",   hex: "#FFB6C1" },
                  { name: "Hồng Đào",   hex: "#FF85A1" }],
      eyeshadow: [{ name: "Xanh Neon",  hex: "#00BFFF" }, { name: "Xanh Mint",   hex: "#00FF7F" },
                  { name: "Lime",        hex: "#ADFF2F" }, { name: "Vàng Neon",   hex: "#FFFF00" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Đỏ Tươi Rực",       hex: "#FF2020" },
        { name: "Hồng Neon",         hex: "#FF1493" },
        { name: "Xanh Điện",         hex: "#00BFFF" },
        { name: "Vàng Neon",         hex: "#FFFF00" },
        { name: "Cam Rực",           hex: "#FF6600" },
        { name: "Xanh Lime",         hex: "#ADFF2F" },
      ],
      bottoms: [
        { name: "Trắng Thuần",        hex: "#FFFFFF" },
        { name: "Đen Tuyền",          hex: "#000000" },
        { name: "Xanh Navy",          hex: "#003366" },
        { name: "Vàng Neon",          hex: "#FFFF44" },
        { name: "Hồng Neon Nhạt",     hex: "#FFB6E1" },
      ],
      avoid: [
        { name: "Be Xỉn",             hex: "#C8A880" },
        { name: "Nâu Trầm",          hex: "#6B4226" },
        { name: "Xám Lạnh Đậm",      hex: "#606070" },
        { name: "Olive Xỉn",          hex: "#6B6B40" },
      ],
    },
  },

  // ───────────────────────── SUMMER ─────────────────────────────────────────
  Summer_Light: {
    label: "Summer Light (Nhẹ nhàng, Dịu dàng)",
    season: "Summer",
    description:
      "Da sáng mát, ánh hồng nhẹ. Tóc sáng màu. Màu tốt nhất là pastel mát, lavender, hồng phấn.",
    palette: ["#E6E6FA","#DDA0DD","#FFB6C1","#87CEEB","#B0C4DE","#98FB98","#F0E6FF","#D8BFD8",
              "#E0E8FF","#F0D0E8","#C8E8FF","#E8F8E8"],
    colorGroups: {
      "Soft Lavender": ["#E6E6FA","#D8BFD8","#F0E6FF","#E0E8FF"],
      "Dusty Pink":    ["#FFB6C1","#DDA0DD","#F0D0E8"],
      "Powder Blue":   ["#87CEEB","#B0C4DE","#C8E8FF"],
    },
    recommendedHairColors: [
      { name: "Bạch Kim",      hex: "#C0C0C0" },
      { name: "Xám Bạc",       hex: "#A8A8A8" },
      { name: "Bạch Kim Sáng", hex: "#D3D3D3" },
      { name: "Nâu Xám",       hex: "#B0B0B0" },
      { name: "Nâu Nhạt",      hex: "#987654" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Tím Nhạt",    hex: "#DDA0DD" }, { name: "Hoa Cà",      hex: "#DA70D6" },
                  { name: "Hồng Nhạt",   hex: "#FFB6C1" }, { name: "Hồng Đậm",   hex: "#DB7093" }],
      blush:     [{ name: "Hồng Baby",   hex: "#FFB6C1" }, { name: "Hồng Phấn",   hex: "#FFC0CB" },
                  { name: "Hồng Pastel", hex: "#FFD1DC" }],
      eyeshadow: [{ name: "Lavender",    hex: "#E6E6FA" }, { name: "Tím Nhạt",    hex: "#D8BFD8" },
                  { name: "Xanh Nhạt",   hex: "#B0C4DE" }, { name: "Xanh Da Trời",hex: "#87CEEB" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Lavender Tím Nhạt",  hex: "#E6E6FA" },
        { name: "Xanh Baby",          hex: "#B0D8F8" },
        { name: "Hồng Phấn",          hex: "#FFD1DC" },
        { name: "Trắng Ngà Lạnh",     hex: "#F8F8FF" },
        { name: "Xanh Mist",          hex: "#D0E8F8" },
        { name: "Lilac Nhạt",         hex: "#D8C8F0" },
      ],
      bottoms: [
        { name: "Xám Nhạt",           hex: "#D8D8E8" },
        { name: "Navy Nhạt",          hex: "#8090B8" },
        { name: "Trắng Sữa",          hex: "#FAFAFA" },
        { name: "Xanh Pastel",        hex: "#C0D8F0" },
        { name: "Tím Nhạt",           hex: "#D8D0E8" },
      ],
      avoid: [
        { name: "Cam Rực",            hex: "#FF6600" },
        { name: "Nâu Đất",            hex: "#8B4513" },
        { name: "Vàng Rực",           hex: "#FFD700" },
        { name: "Đỏ Cam",             hex: "#FF4500" },
      ],
    },
  },

  Summer_Cool: {
    label: "Summer Cool (Mát lạnh, Thanh lịch)",
    season: "Summer",
    description:
      "Da mát, tông hồng hoặc xanh nhạt dưới da. Màu tốt nhất là rose, raspberry, blueberry.",
    palette: ["#B0E0E6","#ADD8E6","#87CEFA","#6495ED","#DDA0DD","#EE82EE","#DB7093","#C71585",
              "#9BB8D8","#B090C0","#8090C8","#D060A0"],
    colorGroups: {
      "Cool Blue":   ["#B0E0E6","#87CEFA","#9BB8D8","#8090C8"],
      "Rose & Pink": ["#DB7093","#C71585","#D060A0"],
      "Violet":      ["#DDA0DD","#EE82EE","#B090C0"],
    },
    recommendedHairColors: [
      { name: "Xám Khói",      hex: "#708090" },
      { name: "Xám Bạc",       hex: "#778899" },
      { name: "Bạch Kim",      hex: "#A0A0A0" },
      { name: "Nâu Xám",       hex: "#8B8682" },
      { name: "Nâu Tối",       hex: "#696969" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Rose Deep",  hex: "#DB7093" }, { name: "Raspberry",   hex: "#C71585" },
                  { name: "Hồng Sáng",  hex: "#FF69B4" }, { name: "Đỏ Cranberry",hex: "#DC143C" }],
      blush:     [{ name: "Hồng Lạnh",  hex: "#FFB6C1" }, { name: "Rose Blush",  hex: "#DB7093" },
                  { name: "Hồng Pastel",hex: "#FFC0CB" }],
      eyeshadow: [{ name: "Cornflower", hex: "#6495ED" }, { name: "Royal Blue",  hex: "#4169E1" },
                  { name: "Mauve",       hex: "#DDA0DD" }, { name: "Silver",      hex: "#C0C0C0" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Navy Xanh",          hex: "#003399" },
        { name: "Hồng Raspberry",     hex: "#C71585" },
        { name: "Tím Mờ",             hex: "#8B70B0" },
        { name: "Xanh Cobalt",        hex: "#0047AB" },
        { name: "Xám Lạnh Nhạt",      hex: "#C0C8D8" },
        { name: "Trắng Lạnh",         hex: "#F0F0FF" },
      ],
      bottoms: [
        { name: "Xám Charcoal",       hex: "#36454F" },
        { name: "Xanh Navy",          hex: "#000080" },
        { name: "Trắng Lạnh",         hex: "#F8F8FF" },
        { name: "Xám Bạc",            hex: "#A8A8B8" },
        { name: "Đen Lạnh",           hex: "#0A0A18" },
      ],
      avoid: [
        { name: "Cam Ấm",             hex: "#FF8C00" },
        { name: "Vàng Ấm",            hex: "#DAA520" },
        { name: "Nâu Đỏ",             hex: "#8B4513" },
        { name: "Olive Xanh",         hex: "#808000" },
      ],
    },
  },

  Summer_Soft: {
    label: "Summer Soft (Mềm mại, Nhẹ nhàng)",
    season: "Summer",
    description:
      "Da mát mịn màng, độ bão hòa thấp. Màu tốt nhất là dusty rose, slate blue, sage.",
    palette: ["#F5DEB3","#DEB887","#DCDCDC","#C0C0C0","#E6E6FA","#FFB6C1","#98FB98","#B0C4DE",
              "#D8C8B8","#C8B8C8","#B8C8D8","#C8D8B8"],
    colorGroups: {
      "Muted Neutral": ["#DCDCDC","#C0C0C0","#D8C8B8"],
      "Soft Blush":    ["#FFB6C1","#F5DEB3","#C8B8C8"],
      "Hazy Blue":     ["#E6E6FA","#B0C4DE","#B8C8D8"],
    },
    recommendedHairColors: [
      { name: "Nâu Hồng",   hex: "#BC8F8F" },
      { name: "Nâu Mật",    hex: "#C0A080" },
      { name: "Nâu Pastel", hex: "#B8A090" },
      { name: "Nâu Xám",    hex: "#A09080" },
      { name: "Nâu Nhạt",   hex: "#9B8B7B" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Mauve",      hex: "#BC8F8F" }, { name: "Dusty Rose",  hex: "#CD8A8A" },
                  { name: "Rose Nhạt",  hex: "#C68484" }, { name: "Hồng Đất",   hex: "#D8A0A0" }],
      blush:     [{ name: "Hồng Phấn", hex: "#FADADD" }, { name: "Hồng Nhạt",  hex: "#F4C2C2" },
                  { name: "Dusty Blush",hex: "#E8B4B8" }],
      eyeshadow: [{ name: "Slate Blue", hex: "#B0C4DE" }, { name: "Silver",      hex: "#C0C0C0" },
                  { name: "Mauve",      hex: "#D8BFD8" }, { name: "Ash",         hex: "#DCDCDC" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Dusty Rose",         hex: "#C08080" },
        { name: "Slate Blue Mờ",      hex: "#9AABB8" },
        { name: "Sage Xanh Mờ",       hex: "#A8B8A0" },
        { name: "Lavender Mờ",        hex: "#C8C0D8" },
        { name: "Be Hồng Mờ",         hex: "#E0C8C0" },
        { name: "Xám Xanh Nhạt",      hex: "#C0C8D0" },
      ],
      bottoms: [
        { name: "Xám Nhạt Mờ",        hex: "#D0D0D0" },
        { name: "Be Xám",             hex: "#C8C0B8" },
        { name: "Xanh Xám Lạnh",      hex: "#A0A8B0" },
        { name: "Trắng Ngà Mờ",       hex: "#F0EEE8" },
        { name: "Hồng Be",            hex: "#D8C0BC" },
      ],
      avoid: [
        { name: "Đen Tuyền",          hex: "#000000" },
        { name: "Cam Sặc Sỡ",         hex: "#FF4500" },
        { name: "Vàng Rực",           hex: "#FFD700" },
        { name: "Đỏ Tươi",            hex: "#FF0000" },
      ],
    },
  },

  Summer_Muted: {
    label: "Summer Muted (Mờ dịu, Trầm)",
    season: "Summer",
    description:
      "Tông cool mờ đục, da mát xám nhẹ. Màu tốt nhất là slate, sage, dusty mauve.",
    palette: ["#BEBEBE","#A9A9A9","#D2B48C","#BC8F8F","#8FBC8F","#6B8E8B","#708090","#9B8B7B",
              "#A8A8B8","#B8A8A8","#A8B8A8","#989898"],
    colorGroups: {
      "Cool Grey":    ["#BEBEBE","#A9A9A9","#708090","#A8A8B8"],
      "Dusty Rose":   ["#BC8F8F","#D2B48C","#B8A8A8"],
      "Sage & Slate": ["#8FBC8F","#6B8E8B","#A8B8A8"],
    },
    recommendedHairColors: [
      { name: "Xám Trung",   hex: "#808080" },
      { name: "Xám Tối",     hex: "#696969" },
      { name: "Xám Sáng",    hex: "#A0A0A0" },
      { name: "Nâu Xám",     hex: "#8B8682" },
      { name: "Xám Nhạt",    hex: "#7B7B7B" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Dusty Mauve", hex: "#BC8F8F" }, { name: "Mauve",      hex: "#A08080" },
                  { name: "Rose Mờ",     hex: "#9B8080" }, { name: "Hồng Tro",   hex: "#B09090" }],
      blush:     [{ name: "Tan Nhạt",   hex: "#D2B48C" }, { name: "Caramel",    hex: "#C8A882" },
                  { name: "Wheat Blush",hex: "#BFA07A" }],
      eyeshadow: [{ name: "Ash Grey",   hex: "#A9A9A9" }, { name: "Slate",      hex: "#808080" },
                  { name: "Sage",        hex: "#6B8E8B" }, { name: "Dusty Green",hex: "#8FBC8F" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Slate Xám Mờ",       hex: "#708090" },
        { name: "Sage Mờ",            hex: "#8FA88A" },
        { name: "Dusty Mauve",        hex: "#B09090" },
        { name: "Xám Xanh",           hex: "#8090A0" },
        { name: "Be Xám Lạnh",        hex: "#C0B8B0" },
        { name: "Dusty Blue",         hex: "#9AAAB8" },
      ],
      bottoms: [
        { name: "Xám Charcoal",       hex: "#454545" },
        { name: "Xám Trung",          hex: "#909090" },
        { name: "Đen Xám",            hex: "#282828" },
        { name: "Xanh Xám Navy",      hex: "#404858" },
        { name: "Be Xỉn",             hex: "#B8A898" },
      ],
      avoid: [
        { name: "Cam Sặc Sỡ",         hex: "#FF4500" },
        { name: "Vàng Rực",           hex: "#FFD700" },
        { name: "Đỏ Tươi",            hex: "#FF0000" },
        { name: "Xanh Neon",          hex: "#00FF00" },
      ],
    },
  },

  // ───────────────────────── AUTUMN ─────────────────────────────────────────
  Autumn_Warm: {
    label: "Autumn Warm (Ấm, Phong Phú)",
    season: "Autumn",
    description:
      "Da vàng đất ấm, tóc đỏ đồng hoặc nâu vàng. Màu tốt nhất là earth tones, terracotta, mustard.",
    palette: ["#8B4513","#A0522D","#D2691E","#CD853F","#DAA520","#B8860B","#8B6914","#6B4226",
              "#C87941","#A86030","#906020","#784018"],
    colorGroups: {
      "Warm Brown":    ["#8B4513","#A0522D","#6B4226","#784018"],
      "Golden Amber":  ["#DAA520","#B8860B","#8B6914","#906020"],
      "Rust & Copper": ["#D2691E","#CD853F","#C87941","#A86030"],
    },
    recommendedHairColors: [
      { name: "Nâu Đỏ",     hex: "#4A2C0A" },
      { name: "Đỏ Đồng",    hex: "#6B3A2A" },
      { name: "Nâu Đất",    hex: "#8B4513" },
      { name: "Nâu Gỗ",     hex: "#5C3317" },
      { name: "Cà Phê Đậm", hex: "#3B2006" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Gạch Đất",   hex: "#8B4513" }, { name: "Đỏ Nâu",    hex: "#A0522D" },
                  { name: "Đỏ Gỉ Sắt", hex: "#B8480A" }, { name: "Đồng Đỏ",   hex: "#C04000" }],
      blush:     [{ name: "Đồng Nhạt",  hex: "#CD853F" }, { name: "Đất",        hex: "#D2691E" },
                  { name: "Caramel",    hex: "#C07840" }],
      eyeshadow: [{ name: "Vàng Kim",   hex: "#DAA520" }, { name: "Đồng",       hex: "#B8860B" },
                  { name: "Olive",      hex: "#8B6914" }, { name: "Nâu Đất",    hex: "#A0522D" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Cam Đất Terracotta",  hex: "#C84B00" },
        { name: "Vàng Mustard",        hex: "#FFBF00" },
        { name: "Nâu Đỏ Rust",         hex: "#B7410E" },
        { name: "Olive Vàng",          hex: "#808000" },
        { name: "Vàng Cà Ri",          hex: "#E0A020" },
        { name: "Cam Nâu",             hex: "#D2691E" },
      ],
      bottoms: [
        { name: "Nâu Chocolate",       hex: "#3B1A08" },
        { name: "Nâu Da Bò",           hex: "#6B4226" },
        { name: "Kaki Đậm",            hex: "#78704A" },
        { name: "Đen Nâu",             hex: "#1C0A00" },
        { name: "Olive Đậm",           hex: "#4A4820" },
      ],
      avoid: [
        { name: "Hồng Baby",           hex: "#FFB6C1" },
        { name: "Xanh Lạnh Pastel",    hex: "#ADD8E6" },
        { name: "Bạc Lạnh",            hex: "#C0C0C8" },
        { name: "Tím Lạnh",            hex: "#8B00FF" },
      ],
    },
  },

  Autumn_Deep: {
    label: "Autumn Deep (Sâu thẳm, Đậm)",
    season: "Autumn",
    description:
      "Da đậm tông vàng nâu sâu. Màu tốt nhất là burgundy, forest green, dark chocolate.",
    palette: ["#3B1A08","#5C2E0A","#722F00","#8B0000","#4B3832","#6B3A2A","#856048","#704214",
              "#602808","#501800","#400800","#2A1000"],
    colorGroups: {
      "Deep Red":       ["#8B0000","#722F00","#600018","#500008"],
      "Dark Brown":     ["#3B1A08","#5C2E0A","#602808","#2A1000"],
      "Bronze & Umber": ["#856048","#704214","#6B3A2A"],
    },
    recommendedHairColors: [
      { name: "Đen Nhánh",   hex: "#1C0A00" },
      { name: "Đen Nâu",     hex: "#2B1200" },
      { name: "Nâu Rất Đậm", hex: "#3B1A08" },
      { name: "Đen Tuyền",   hex: "#0A0000" },
      { name: "Nâu Đen",     hex: "#1A0800" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Burgundy",    hex: "#8B0000" }, { name: "Đỏ Oxblood", hex: "#722F00" },
                  { name: "Đỏ Crimson",  hex: "#C41E3A" }, { name: "Đỏ Đậm",     hex: "#B22222" }],
      blush:     [{ name: "Terracotta",  hex: "#6B3A2A" }, { name: "Nâu Đỏ",     hex: "#8B4513" },
                  { name: "Đồng Đậm",   hex: "#7B3A28" }],
      eyeshadow: [{ name: "Nâu Tối",    hex: "#3B1A08" }, { name: "Bronze",     hex: "#856048" },
                  { name: "Đen Khói",    hex: "#4B3832" }, { name: "Nâu Đồng",   hex: "#6B3A2A" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Burgundy Đỏ Rượu",    hex: "#800020" },
        { name: "Xanh Rừng",           hex: "#228B22" },
        { name: "Nâu Socola",          hex: "#5C2E0A" },
        { name: "Đỏ Gạch Đậm",         hex: "#8B0000" },
        { name: "Tím Mận",             hex: "#6B2D5E" },
        { name: "Đồng Đậm",            hex: "#704214" },
      ],
      bottoms: [
        { name: "Đen Nâu",             hex: "#1C0A00" },
        { name: "Nâu Rất Đậm",         hex: "#3B1A08" },
        { name: "Xanh Tối",            hex: "#1A3A2A" },
        { name: "Đen Tuyền",           hex: "#000000" },
        { name: "Nâu Chocolate",        hex: "#2A1000" },
      ],
      avoid: [
        { name: "Hồng Pastel",         hex: "#FFD1DC" },
        { name: "Vàng Neon",           hex: "#FFFF00" },
        { name: "Xanh Sky",            hex: "#87CEEB" },
        { name: "Trắng Thuần",         hex: "#FFFFFF" },
      ],
    },
  },

  Autumn_Soft: {
    label: "Autumn Soft (Mềm mại, Tự nhiên)",
    season: "Autumn",
    description:
      "Da ấm mềm, tông đất nhạt. Màu tốt nhất là camel, warm beige, dusty peach.",
    palette: ["#C4956A","#BF8B5E","#A07850","#8B7355","#D2B48C","#C8A882","#B8906A","#A07050",
              "#D0A878","#C09868","#B08858","#A07848"],
    colorGroups: {
      "Soft Brown":  ["#C4956A","#BF8B5E","#A07050","#B08858"],
      "Warm Tan":    ["#D2B48C","#C8A882","#D0A878","#C09868"],
      "Caramel":     ["#A07850","#B8906A","#A07848"],
    },
    recommendedHairColors: [
      { name: "Nâu Caramel",  hex: "#6B4226" },
      { name: "Nâu Đất",      hex: "#7B5236" },
      { name: "Nâu Vừa",      hex: "#8B6246" },
      { name: "Nâu Gỗ Nhạt",  hex: "#704820" },
      { name: "Nâu Trung",    hex: "#5C3A18" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Nâu Đào",   hex: "#C4956A" }, { name: "Nâu Nhạt",   hex: "#B8845A" },
                  { name: "Caramel",    hex: "#A0784A" }, { name: "Gỗ Ấm",      hex: "#C07848" }],
      blush:     [{ name: "Tan",        hex: "#D2B48C" }, { name: "Warm Peach", hex: "#C4956A" },
                  { name: "Caramel",    hex: "#BF8B5E" }],
      eyeshadow: [{ name: "Beige",      hex: "#C8A882" }, { name: "Warm Brown", hex: "#B8906A" },
                  { name: "Tan",        hex: "#A07850" }, { name: "Khaki",      hex: "#8B7355" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Camel Lạc Đà",        hex: "#C19A6B" },
        { name: "Peach Đất",           hex: "#FFAD80" },
        { name: "Be Ấm",               hex: "#E8C8A0" },
        { name: "Nâu Tan",             hex: "#D2B48C" },
        { name: "Xanh Olive Mờ",       hex: "#A8A870" },
        { name: "Nâu Đỏ Nhạt",         hex: "#C08060" },
      ],
      bottoms: [
        { name: "Nâu Caramel",         hex: "#6B4226" },
        { name: "Kaki Ấm",             hex: "#A09060" },
        { name: "Nâu Đất",             hex: "#7B5236" },
        { name: "Be Đậm",              hex: "#C8A878" },
        { name: "Olive Nhạt",          hex: "#808060" },
      ],
      avoid: [
        { name: "Xanh Lạnh",           hex: "#4169E1" },
        { name: "Hồng Lạnh",           hex: "#DB7093" },
        { name: "Tím Lạnh",            hex: "#9400D3" },
        { name: "Bạc Lạnh",            hex: "#C0C0C8" },
      ],
    },
  },

  Autumn_Muted: {
    label: "Autumn Muted (Mờ Đục, Cổ Điển)",
    season: "Autumn",
    description:
      "Da ấm mờ đục trung bình. Màu tốt nhất là olive, khaki, muted terracotta.",
    palette: ["#8B7355","#A0896B","#6B5840","#7A6248","#9B8B7B","#8B7B6B","#786050","#6B5848",
              "#958070","#857060","#756050","#655040"],
    colorGroups: {
      "Muted Brown": ["#8B7355","#786050","#6B5848","#655040"],
      "Warm Grey":   ["#9B8B7B","#8B7B6B","#958070","#857060"],
      "Olive Khaki": ["#6B5840","#7A6248","#756050"],
    },
    recommendedHairColors: [
      { name: "Nâu Xỉn",      hex: "#4A3828" },
      { name: "Nâu Trầm",     hex: "#5A4838" },
      { name: "Nâu Xám",      hex: "#6A5848" },
      { name: "Nâu Đen Nhạt", hex: "#3A2818" },
      { name: "Nâu Đất Trầm", hex: "#4A3020" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Đất Nhạt",   hex: "#8B6B4B" }, { name: "Nâu Xỉn",    hex: "#7B5B3B" },
                  { name: "Nâu Mật",    hex: "#9B7B5B" }, { name: "Caramel Mờ", hex: "#A07848" }],
      blush:     [{ name: "Warm Khaki", hex: "#9B8B7B" }, { name: "Olive Blush", hex: "#A09080" },
                  { name: "Nâu Ấm",    hex: "#8B7B6B" }],
      eyeshadow: [{ name: "Khaki",      hex: "#8B7355" }, { name: "Olive",       hex: "#786050" },
                  { name: "Đất",        hex: "#6B5840" }, { name: "Nâu Xỉn",    hex: "#7A6248" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Olive Trầm",          hex: "#6B6B40" },
        { name: "Kaki Mờ",             hex: "#9A8A6A" },
        { name: "Nâu Đất Mờ",          hex: "#8B7355" },
        { name: "Rỉ Sắt Mờ",           hex: "#8B5840" },
        { name: "Xanh Rừng Mờ",        hex: "#5A7060" },
        { name: "Nâu Xám Ấm",          hex: "#9B8B7B" },
      ],
      bottoms: [
        { name: "Nâu Tối",             hex: "#4A3828" },
        { name: "Kaki Đậm",            hex: "#6A6040" },
        { name: "Xanh Olive Đậm",      hex: "#4A5030" },
        { name: "Nâu Đen",             hex: "#2A1818" },
        { name: "Đen Ấm",              hex: "#181008" },
      ],
      avoid: [
        { name: "Hồng Fuchsia",        hex: "#FF00FF" },
        { name: "Xanh Điện Lạnh",      hex: "#0000FF" },
        { name: "Trắng Thuần Lạnh",    hex: "#F5F5FF" },
        { name: "Bạc Sáng",            hex: "#D0D0E0" },
      ],
    },
  },

  // ───────────────────────── WINTER ─────────────────────────────────────────
  Winter_Deep: {
    label: "Winter Deep (Sâu tối, Mạnh mẽ)",
    season: "Winter",
    description:
      "Da rất sâu, tóc đen hoặc rất nâu đậm. Màu tốt nhất là đen, trắng, burgundy, navy.",
    palette: ["#000000","#0A0A0A","#1C1C1C","#2F2F2F","#000080","#00008B","#191970","#003153",
              "#0D0D0D","#1A1A1A","#001040","#002060"],
    colorGroups: {
      "Black Family": ["#000000","#1C1C1C","#2F2F2F","#0D0D0D","#1A1A1A"],
      "Deep Navy":    ["#000080","#00008B","#001040","#002060"],
      "Midnight":     ["#191970","#003153"],
    },
    recommendedHairColors: [
      { name: "Đen Tuyền",   hex: "#000000" },
      { name: "Đen Bóng",    hex: "#0A0A0A" },
      { name: "Đen Nhánh",   hex: "#1C1C1C" },
      { name: "Đen Xanh",    hex: "#080808" },
      { name: "Đen Nâu",     hex: "#0F0F0F" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Burgundy",    hex: "#8B0000" }, { name: "Fuchsia",    hex: "#C71585" },
                  { name: "Đỏ Crimson",  hex: "#DC143C" }, { name: "Bordeaux",   hex: "#800020" }],
      blush:     [{ name: "Deep Rose",   hex: "#DC143C" }, { name: "Fuchsia",    hex: "#C71585" },
                  { name: "Đỏ Rượu",    hex: "#8B0000" }],
      eyeshadow: [{ name: "Đen",         hex: "#000000" }, { name: "Charcoal",   hex: "#1C1C1C" },
                  { name: "Navy",        hex: "#191970" }, { name: "Royal Blue",  hex: "#4169E1" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Đen Tuyền",            hex: "#000000" },
        { name: "Trắng Tinh",           hex: "#FFFFFF" },
        { name: "Đỏ Rượu Burgundy",     hex: "#800020" },
        { name: "Navy Xanh Đậm",        hex: "#000080" },
        { name: "Đỏ Thuần",             hex: "#CC0000" },
        { name: "Bạch Kim Sáng",        hex: "#E8E8E8" },
      ],
      bottoms: [
        { name: "Đen Thuần",            hex: "#000000" },
        { name: "Xanh Navy Đậm",        hex: "#000033" },
        { name: "Xám Đậm",              hex: "#1A1A1A" },
        { name: "Đen Charcoal",         hex: "#282828" },
        { name: "Navy Đen",             hex: "#001020" },
      ],
      avoid: [
        { name: "Be Ấm",                hex: "#E8C89A" },
        { name: "Nâu Caramel",          hex: "#C19A6B" },
        { name: "Vàng Ấm",              hex: "#DAA520" },
        { name: "Olive",                hex: "#808000" },
      ],
    },
  },

  Winter_Cool: {
    label: "Winter Cool (Lạnh, Thanh lịch)",
    season: "Winter",
    description:
      "Da mát trắng hồng hoặc olive lạnh. Màu tốt nhất là icy white, cool grey, royal purple.",
    palette: ["#F8F8FF","#E8E8F8","#C0C0C0","#A8A8C8","#6A5ACD","#483D8B","#191970","#DC143C",
              "#D0D0F0","#B8B8D8","#8070C0","#9080B0"],
    colorGroups: {
      "Icy White":   ["#F8F8FF","#E8E8F8","#D0D0F0"],
      "Cool Silver": ["#C0C0C0","#A8A8C8","#B8B8D8"],
      "Royal":       ["#6A5ACD","#483D8B","#8070C0","#9080B0"],
    },
    recommendedHairColors: [
      { name: "Đen Xanh",      hex: "#1A1A2E" },
      { name: "Đen Navy",      hex: "#16213E" },
      { name: "Đen Xanh Đậm", hex: "#0F3460" },
      { name: "Tím Đen",       hex: "#2C2C54" },
      { name: "Đen Lạnh",      hex: "#1B1B2F" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Đỏ Lạnh",   hex: "#DC143C" }, { name: "Fuchsia",     hex: "#C71585" },
                  { name: "Hồng Neon",  hex: "#FF0080" }, { name: "Đỏ Cherry",   hex: "#B22222" }],
      blush:     [{ name: "Fuchsia",    hex: "#C71585" }, { name: "Hồng Lạnh",   hex: "#FF69B4" },
                  { name: "Rose Deep",  hex: "#DB7093" }],
      eyeshadow: [{ name: "Silver",     hex: "#C0C0C0" }, { name: "Icy Lilac",   hex: "#A8A8C8" },
                  { name: "Royal",      hex: "#6A5ACD" }, { name: "Sapphire",    hex: "#483D8B" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Trắng Băng Lạnh",     hex: "#F0F0FF" },
        { name: "Xám Bạc",             hex: "#C0C0C0" },
        { name: "Tím Royal",           hex: "#6A5ACD" },
        { name: "Xanh Sapphire",       hex: "#0F52BA" },
        { name: "Đen Lạnh",            hex: "#1A1A2E" },
        { name: "Hồng Lạnh",           hex: "#FF90B8" },
      ],
      bottoms: [
        { name: "Đen Lạnh",            hex: "#0A0A18" },
        { name: "Xám Charcoal Lạnh",   hex: "#303040" },
        { name: "Navy Lạnh",           hex: "#000040" },
        { name: "Bạc Xám",             hex: "#A0A0B0" },
        { name: "Xanh Tối Lạnh",       hex: "#101030" },
      ],
      avoid: [
        { name: "Cam Ấm",              hex: "#FF8C00" },
        { name: "Nâu Caramel",         hex: "#C19A6B" },
        { name: "Olive Ấm",            hex: "#808000" },
        { name: "Vàng Ấm",             hex: "#DAA520" },
      ],
    },
  },

  Winter_Clear: {
    label: "Winter Clear (Rõ ràng, Sắc nét)",
    season: "Winter",
    description:
      "Da trắng sứ hoặc da sáng, contrast rất cao. Màu tốt nhất là pure white, black, vivid primaries.",
    palette: ["#FFFFFF","#F0F0FF","#00FFFF","#00FF00","#FF00FF","#0000FF","#FF0000","#FFD700",
              "#FF80FF","#80FF80","#80FFFF","#FF8080"],
    colorGroups: {
      "Pure & Icy":      ["#FFFFFF","#F0F0FF"],
      "Vivid Primary":   ["#FF0000","#0000FF","#FF00FF"],
      "Neon Accent":     ["#00FFFF","#00FF00","#FFD700"],
    },
    recommendedHairColors: [
      { name: "Đen Tuyền",    hex: "#000000" },
      { name: "Đen Nhạt",     hex: "#1A1A1A" },
      { name: "Đen Charcoal", hex: "#2C2C2C" },
      { name: "Đen Sâu",      hex: "#0A0A0A" },
      { name: "Đen Xanh",     hex: "#151515" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Đỏ Thuần",  hex: "#FF0000" }, { name: "Hồng Neon",  hex: "#FF0080" },
                  { name: "Hot Pink",   hex: "#FF1493" }, { name: "Crimson",    hex: "#DC143C" }],
      blush:     [{ name: "Hot Pink",   hex: "#FF69B4" }, { name: "Fuchsia",    hex: "#FF1493" },
                  { name: "Deep Rose",  hex: "#DB7093" }],
      eyeshadow: [{ name: "Cyan",       hex: "#00FFFF" }, { name: "Navy",       hex: "#0000FF" },
                  { name: "Violet",     hex: "#8B00FF" }, { name: "Fuchsia",    hex: "#FF00FF" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Trắng Tinh Khiết",    hex: "#FFFFFF" },
        { name: "Đen Tuyền",           hex: "#000000" },
        { name: "Đỏ Thuần",            hex: "#FF0000" },
        { name: "Xanh Điện",           hex: "#0000FF" },
        { name: "Fuchsia Sặc",         hex: "#FF00FF" },
        { name: "Cyan Trong",          hex: "#00FFFF" },
      ],
      bottoms: [
        { name: "Đen Tuyền",           hex: "#000000" },
        { name: "Trắng Thuần",         hex: "#FFFFFF" },
        { name: "Xanh Navy Thuần",     hex: "#000066" },
        { name: "Xám Lạnh",            hex: "#404050" },
        { name: "Đen Xanh",            hex: "#050510" },
      ],
      avoid: [
        { name: "Be Ấm",               hex: "#F5DEB3" },
        { name: "Cam Ấm",              hex: "#FF8C00" },
        { name: "Nâu Đất",             hex: "#8B4513" },
        { name: "Vàng Mù Tạt",         hex: "#FFBF00" },
      ],
    },
  },

  Winter_Bright: {
    label: "Winter Bright (Rực rỡ, Tươi sáng)",
    season: "Winter",
    description:
      "Da lạnh sáng, contrast cao. Màu tốt nhất là bright jewel tones, icy pastels with bold accents.",
    palette: ["#F5F5F5","#E0E0FF","#FF4444","#4444FF","#FF44FF","#44FFFF","#FFFF44","#FF8C00",
              "#CC2222","#2222CC","#CC22CC","#22CCCC"],
    colorGroups: {
      "Bright White":  ["#F5F5F5","#E0E0FF"],
      "Vivid Cool":    ["#4444FF","#FF44FF","#44FFFF","#22CCCC"],
      "High Contrast": ["#FF4444","#FFFF44","#CC2222"],
    },
    recommendedHairColors: [
      { name: "Đen Bóng",   hex: "#0A0A0A" },
      { name: "Đen Chì",    hex: "#1C1C1C" },
      { name: "Đen Tuyền",  hex: "#000000" },
      { name: "Đen Xám",    hex: "#2A2A2A" },
      { name: "Đen Nhạt",   hex: "#080808" },
    ],
    recommendedMakeup: {
      lipstick:  [{ name: "Đỏ Tươi",    hex: "#FF4444" }, { name: "Hồng Bright", hex: "#FF0066" },
                  { name: "Đỏ Sáng",    hex: "#CC0044" }, { name: "Đỏ Cherry",   hex: "#FF1155" }],
      blush:     [{ name: "Hot Pink",   hex: "#FF69B4" }, { name: "Hồng Sáng",   hex: "#FF85A1" },
                  { name: "Hồng Baby",  hex: "#FFB6C1" }],
      eyeshadow: [{ name: "Sapphire",   hex: "#4444FF" }, { name: "Cyan",        hex: "#44FFFF" },
                  { name: "Fuchsia",    hex: "#FF44FF" }, { name: "Vàng Neon",   hex: "#FFFF44" }],
    },
    recommendedClothing: {
      tops: [
        { name: "Trắng Sáng",           hex: "#F5F5F5" },
        { name: "Đỏ Tươi Bright",       hex: "#FF2233" },
        { name: "Xanh Điện Bright",     hex: "#3333FF" },
        { name: "Fuchsia Sặc",          hex: "#FF00CC" },
        { name: "Cyan Sáng",            hex: "#00DDDD" },
        { name: "Đen Tuyền",            hex: "#000000" },
      ],
      bottoms: [
        { name: "Đen",                  hex: "#000000" },
        { name: "Trắng Sáng",           hex: "#FAFAFA" },
        { name: "Xám Lạnh",             hex: "#404055" },
        { name: "Navy Lạnh Sáng",       hex: "#001055" },
        { name: "Đen Xám Lạnh",         hex: "#1A1A2A" },
      ],
      avoid: [
        { name: "Be Xỉn",               hex: "#D2B48C" },
        { name: "Nâu Đất",              hex: "#8B4513" },
        { name: "Vàng Ấm",              hex: "#DAA520" },
        { name: "Cam Ấm",               hex: "#FF8C00" },
      ],
    },
  },
};

/** Bảng tên mùa thân thiện */
export const SEASON_LABELS = {
  Spring: "🌸 Mùa Xuân",
  Summer: "☀️ Mùa Hè",
  Autumn: "🍂 Mùa Thu",
  Winter: "❄️ Mùa Đông",
};

/** Màu accent cho từng mùa (dùng UI) */
export const SEASON_ACCENT = {
  Spring: "#FF8C69",
  Summer: "#87CEEB",
  Autumn: "#D2691E",
  Winter: "#6495ED",
};
