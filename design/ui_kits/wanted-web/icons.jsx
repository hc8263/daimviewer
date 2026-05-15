// Lucide icons — closest open-source match to Wanted's house icon style (1.5px stroke, 24×24).
// Each icon is a tiny inline SVG so we don't depend on a runtime import.

const ic = {};

const make = (paths, viewBox = "0 0 24 24") => ({ size = 20, color = "currentColor", style = {}, strokeWidth = 1.8 }) =>
  React.createElement("svg", {
    width: size, height: size, viewBox, fill: "none",
    stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round",
    style,
  }, ...paths.map((d, i) => React.createElement("path", { key: i, d })));

ic.Search = make(["M21 21l-4.3-4.3", "M19 11a8 8 0 11-16 0 8 8 0 0116 0z"]);
ic.User = make(["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2", "M16 7a4 4 0 11-8 0 4 4 0 018 0z"]);
ic.Bell = make(["M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 003.4 0"]);
ic.Bookmark = make(["M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"]);
ic.BookmarkFill = ({ size = 20, color = "#0066FF", style = {} }) =>
  React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: color, style },
    React.createElement("path", { d: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" }));
ic.ChevronDown = make(["M6 9l6 6 6-6"]);
ic.ChevronRight = make(["M9 6l6 6-6 6"]);
ic.ChevronLeft = make(["M15 6l-6 6 6 6"]);
ic.MapPin = make(["M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z", "M12 10a2 2 0 100-4 2 2 0 000 4z"]);
ic.Briefcase = make(["M20 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z", "M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"]);
ic.Calendar = make(["M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z", "M16 2v4", "M8 2v4", "M3 10h18"]);
ic.Building = make(["M3 21V7a2 2 0 012-2h6a2 2 0 012 2v14", "M13 11h6a2 2 0 012 2v8", "M7 9h2", "M7 13h2", "M7 17h2", "M16 15h2", "M16 19h2"]);
ic.Share = make(["M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8", "M16 6l-4-4-4 4", "M12 2v13"]);
ic.Plus = make(["M12 5v14", "M5 12h14"]);
ic.X = make(["M18 6L6 18", "M6 6l12 12"]);
ic.Filter = make(["M22 3H2l8 9.5V19l4 2v-8.5L22 3z"]);
ic.LogOut = make(["M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4", "M16 17l5-5-5-5", "M21 12H9"]);
ic.Settings = make([
  "M12 15a3 3 0 100-6 3 3 0 000 6z",
  "M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
]);
ic.Heart = make(["M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"]);
ic.MessageSquare = make(["M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"]);
ic.Sparkles = make(["M12 3l1.9 4.7L19 9.6l-4.7 1.9L12 16l-2.3-4.5L5 9.6l5.1-1.9L12 3z", "M5 17l1 2.5 2.5 1-2.5 1L5 24l-1-2.5L1.5 20.5l2.5-1L5 17z", "M18 13l.7 1.6L20 15l-1.3.4L18 17l-.7-1.6L16 15l1.3-.4L18 13z"]);
ic.Bot = make(["M12 8V4H8", "M16 4h-4", "M20 8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2v-8a2 2 0 012-2h16z", "M9 13v.01", "M15 13v.01"]);
ic.Clock = make(["M12 22a10 10 0 100-20 10 10 0 000 20z", "M12 6v6l4 2"]);
ic.Eye = make(["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z", "M12 15a3 3 0 100-6 3 3 0 000 6z"]);
ic.Star = make(["M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"]);

window.IC = ic;
