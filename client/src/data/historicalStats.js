/**
 * Historical Player Stats ó Real NFL data from nflverse (2021-2025)
 * Used by HexScore engine for multi-year weighted production.
 * Format: { players: { playerId: { year: { avgPts, gp, totalPts } } }, meta: {...} }
 */

export const HISTORICAL_STATS = {
  players: {
    p1: { '2025': { avgPts: 22.8, gp: 16, totalPts: 364.6 }, '2024': { avgPts: 23.7, gp: 16, totalPts: 379.0 }, '2023': { avgPts: 23.1, gp: 17, totalPts: 392.6 }, '2022': { avgPts: 24.7, gp: 16, totalPts: 395.5 }, '2021': { avgPts: 23.7, gp: 17, totalPts: 402.6 } }, // Josh Allen
    p2: { '2025': { avgPts: 20.7, gp: 17, totalPts: 352.0 }, '2024': { avgPts: 13.6, gp: 13, totalPts: 177.1 } }, // Drake Maye
    p3: { '2025': { avgPts: 20.6, gp: 17, totalPts: 350.4 }, '2024': { avgPts: 13.4, gp: 16, totalPts: 214.6 }, '2023': { avgPts: 16.2, gp: 15, totalPts: 243.1 }, '2022': { avgPts: 12.0, gp: 9, totalPts: 108.4 }, '2021': { avgPts: 19.4, gp: 17, totalPts: 329.7 } }, // Matthew Stafford
    p4: { '2025': { avgPts: 20.4, gp: 14, totalPts: 285.7 }, '2024': { avgPts: 17.7, gp: 16, totalPts: 283.0 }, '2023': { avgPts: 17.5, gp: 16, totalPts: 280.2 }, '2022': { avgPts: 24.6, gp: 17, totalPts: 417.4 }, '2021': { avgPts: 21.3, gp: 17, totalPts: 361.7 } }, // Patrick Mahomes
    p5: { '2025': { avgPts: 19.9, gp: 17, totalPts: 338.2 }, '2024': { avgPts: 14.5, gp: 10, totalPts: 145.2 }, '2023': { avgPts: 16.4, gp: 16, totalPts: 262.5 }, '2022': { avgPts: 17.4, gp: 17, totalPts: 295.6 }, '2021': { avgPts: 11.7, gp: 17, totalPts: 199.0 } }, // Trevor Lawrence
    p6: { '2025': { avgPts: 19.7, gp: 9, totalPts: 177.4 }, '2024': { avgPts: 17.8, gp: 15, totalPts: 266.9 }, '2023': { avgPts: 18.5, gp: 16, totalPts: 295.6 }, '2022': { avgPts: 11.8, gp: 9, totalPts: 106.3 } }, // Brock Purdy
    p7: { '2025': { avgPts: 18.8, gp: 16, totalPts: 301.1 }, '2024': { avgPts: 21.0, gp: 15, totalPts: 315.1 }, '2023': { avgPts: 21.0, gp: 17, totalPts: 356.8 }, '2022': { avgPts: 25.2, gp: 15, totalPts: 378.0 }, '2021': { avgPts: 20.8, gp: 15, totalPts: 312.2 } }, // Jalen Hurts
    p8: { '2025': { avgPts: 18.7, gp: 17, totalPts: 318.2 }, '2024': { avgPts: 15.0, gp: 17, totalPts: 254.5 } }, // Caleb Williams
    p9: { '2025': { avgPts: 18.5, gp: 17, totalPts: 313.8 }, '2024': { avgPts: 14.6, gp: 8, totalPts: 116.5 }, '2023': { avgPts: 20.2, gp: 17, totalPts: 342.8 }, '2022': { avgPts: 16.6, gp: 12, totalPts: 198.6 }, '2021': { avgPts: 20.0, gp: 16, totalPts: 320.6 } }, // Dak Prescott
    p10: { '2025': { avgPts: 17.9, gp: 16, totalPts: 286.9 }, '2024': { avgPts: 16.8, gp: 17, totalPts: 285.4 }, '2023': { avgPts: 18.0, gp: 13, totalPts: 234.2 }, '2022': { avgPts: 16.5, gp: 17, totalPts: 281.3 }, '2021': { avgPts: 22.4, gp: 17, totalPts: 380.8 } }, // Justin Herbert
    p11: { '2025': { avgPts: 17.9, gp: 17, totalPts: 304.8 }, '2024': { avgPts: 18.7, gp: 17, totalPts: 317.2 } }, // Bo Nix
    p12: { '2025': { avgPts: 17.5, gp: 17, totalPts: 297.1 }, '2024': { avgPts: 19.1, gp: 17, totalPts: 324.5 }, '2023': { avgPts: 17.0, gp: 17, totalPts: 289.1 }, '2022': { avgPts: 16.7, gp: 17, totalPts: 284.3 }, '2021': { avgPts: 13.9, gp: 14, totalPts: 194.5 } }, // Jared Goff
    p13: { '2025': { avgPts: 17.4, gp: 13, totalPts: 226.4 }, '2024': { avgPts: 13.5, gp: 10, totalPts: 135.3 }, '2023': { avgPts: 9.5, gp: 6, totalPts: 57.0 }, '2022': { avgPts: 18.1, gp: 16, totalPts: 289.0 }, '2021': { avgPts: 15.2, gp: 11, totalPts: 167.5 } }, // Daniel Jones
    p14: { '2025': { avgPts: 17.3, gp: 14, totalPts: 241.6 } }, // Jaxson Dart
    p15: { '2025': { avgPts: 16.8, gp: 8, totalPts: 134.5 }, '2024': { avgPts: 21.9, gp: 17, totalPts: 372.8 }, '2023': { avgPts: 14.7, gp: 10, totalPts: 147.2 }, '2022': { avgPts: 21.9, gp: 16, totalPts: 350.7 }, '2021': { avgPts: 19.6, gp: 16, totalPts: 314.2 } }, // Joe Burrow
    p16: { '2025': { avgPts: 16.5, gp: 13, totalPts: 214.9 }, '2024': { avgPts: 25.3, gp: 17, totalPts: 430.4 }, '2023': { avgPts: 20.7, gp: 16, totalPts: 331.2 }, '2022': { avgPts: 19.7, gp: 12, totalPts: 236.1 }, '2021': { avgPts: 20.0, gp: 12, totalPts: 240.0 } }, // Lamar Jackson
    p17: { '2025': { avgPts: 16.3, gp: 7, totalPts: 114.3 }, '2024': { avgPts: 20.9, gp: 17, totalPts: 355.8 } }, // Jayden Daniels
    p18: { '2025': { avgPts: 16.2, gp: 14, totalPts: 227.4 }, '2024': { avgPts: 6.5, gp: 7, totalPts: 45.2 }, '2023': { avgPts: 11.4, gp: 2, totalPts: 22.9 }, '2022': { avgPts: 12.0, gp: 14, totalPts: 168.6 }, '2021': { avgPts: 7.2, gp: 10, totalPts: 72.3 } }, // Jacoby Brissett
    p19: { '2025': { avgPts: 16.0, gp: 17, totalPts: 271.9 }, '2024': { avgPts: 21.5, gp: 17, totalPts: 365.8 }, '2023': { avgPts: 16.1, gp: 17, totalPts: 274.1 }, '2022': { avgPts: 10.1, gp: 12, totalPts: 121.4 }, '2021': { avgPts: 12.9, gp: 14, totalPts: 180.9 } }, // Baker Mayfield
    p20: { '2025': { avgPts: 15.9, gp: 9, totalPts: 142.7 }, '2024': { avgPts: 11.9, gp: 10, totalPts: 119.1 }, '2023': { avgPts: 17.7, gp: 13, totalPts: 230.2 }, '2022': { avgPts: 19.7, gp: 15, totalPts: 296.0 }, '2021': { avgPts: 10.6, gp: 12, totalPts: 126.8 } }, // Justin Fields
    p21: { '2025': { avgPts: 15.7, gp: 15, totalPts: 235.1 }, '2024': { avgPts: 15.6, gp: 15, totalPts: 233.9 }, '2023': { avgPts: 18.8, gp: 17, totalPts: 319.1 }, '2022': { avgPts: 2.9, gp: 4, totalPts: 11.7 }, '2021': { avgPts: 3.5, gp: 6, totalPts: 21.1 } }, // Jordan Love
    p22: { '2025': { avgPts: 15.6, gp: 5, totalPts: 77.8 }, '2024': { avgPts: 17.5, gp: 17, totalPts: 297.2 }, '2023': { avgPts: 18.3, gp: 8, totalPts: 146.4 }, '2022': { avgPts: 18.2, gp: 11, totalPts: 200.5 }, '2021': { avgPts: 21.5, gp: 14, totalPts: 300.5 } }, // Kyler Murray
    p23: { '2025': { avgPts: 14.9, gp: 14, totalPts: 208.5 }, '2024': { avgPts: 13.0, gp: 17, totalPts: 220.4 }, '2023': { avgPts: 18.4, gp: 15, totalPts: 276.0 } }, // C.J. Stroud
    p24: { '2025': { avgPts: 14.4, gp: 3, totalPts: 43.3 }, '2024': { avgPts: 11.9, gp: 11, totalPts: 131.1 }, '2023': { avgPts: 2.0, gp: 6, totalPts: 12.0 }, '2022': { avgPts: 14.6, gp: 3, totalPts: 43.9 }, '2021': { avgPts: 16.8, gp: 7, totalPts: 117.4 } }, // Jameis Winston
    p25: { '2025': { avgPts: 14.4, gp: 11, totalPts: 158.0 } }, // Tyler Shough
    p26: { '2025': { avgPts: 14.2, gp: 16, totalPts: 227.1 }, '2024': { avgPts: 15.1, gp: 17, totalPts: 256.6 }, '2023': { avgPts: 0.0, gp: 1, totalPts: 0.0 }, '2022': { avgPts: 14.1, gp: 17, totalPts: 239.2 }, '2021': { avgPts: 20.8, gp: 16, totalPts: 333.3 } }, // Aaron Rodgers
    p27: { '2025': { avgPts: 14.1, gp: 5, totalPts: 70.3 }, '2024': { avgPts: 2.4, gp: 2, totalPts: 4.7 }, '2023': { avgPts: 26.1, gp: 1, totalPts: 26.1 }, '2022': { avgPts: 14.1, gp: 8, totalPts: 112.8 }, '2021': { avgPts: 15.2, gp: 17, totalPts: 258.0 } }, // Carson Wentz
    p28: { '2025': { avgPts: 13.8, gp: 17, totalPts: 235.4 }, '2024': { avgPts: 18.1, gp: 17, totalPts: 308.0 }, '2023': { avgPts: 2.3, gp: 10, totalPts: 23.4 }, '2022': { avgPts: 14.4, gp: 6, totalPts: 86.3 }, '2021': { avgPts: 13.1, gp: 12, totalPts: 157.3 } }, // Sam Darnold
    p29: { '2025': { avgPts: 13.6, gp: 16, totalPts: 218.0 }, '2024': { avgPts: 13.9, gp: 14, totalPts: 195.0 }, '2023': { avgPts: 9.8, gp: 16, totalPts: 156.4 } }, // Bryce Young
    p30: { '2025': { avgPts: 13.4, gp: 9, totalPts: 120.3 }, '2024': { avgPts: 8.8, gp: 5, totalPts: 44.1 } }, // Michael Penix Jr.
    p31: { '2025': { avgPts: 12.8, gp: 4, totalPts: 51.2 }, '2024': { avgPts: 8.6, gp: 6, totalPts: 51.8 }, '2023': { avgPts: 1.5, gp: 2, totalPts: 3.1 }, '2022': { avgPts: 2.8, gp: 7, totalPts: 19.3 } }, // Malik Willis
    p32: { '2025': { avgPts: 12.6, gp: 10, totalPts: 125.5 }, '2024': { avgPts: 15.3, gp: 3, totalPts: 45.8 }, '2023': { avgPts: 5.9, gp: 2, totalPts: 11.8 }, '2022': { avgPts: 15.1, gp: 13, totalPts: 196.6 }, '2021': { avgPts: 2.1, gp: 7, totalPts: 14.9 } }, // Marcus Mariota
    p33: { '2025': { avgPts: 24.5, gp: 17, totalPts: 416.6 }, '2024': { avgPts: 11.9, gp: 4, totalPts: 47.8 }, '2023': { avgPts: 24.5, gp: 16, totalPts: 391.3 }, '2022': { avgPts: 21.0, gp: 17, totalPts: 356.4 }, '2021': { avgPts: 18.2, gp: 7, totalPts: 127.5 } }, // Christian McCaffrey
    p34: { '2025': { avgPts: 21.8, gp: 17, totalPts: 370.8 }, '2024': { avgPts: 20.1, gp: 17, totalPts: 341.7 }, '2023': { avgPts: 14.5, gp: 17, totalPts: 246.3 } }, // Bijan Robinson
    p35: { '2025': { avgPts: 21.6, gp: 17, totalPts: 366.9 }, '2024': { avgPts: 21.3, gp: 17, totalPts: 362.9 }, '2023': { avgPts: 16.1, gp: 15, totalPts: 242.1 } }, // Jahmyr Gibbs
    p36: { '2025': { avgPts: 21.3, gp: 17, totalPts: 362.3 }, '2024': { avgPts: 17.5, gp: 14, totalPts: 244.7 }, '2023': { avgPts: 15.6, gp: 10, totalPts: 156.4 }, '2022': { avgPts: 13.3, gp: 11, totalPts: 146.4 }, '2021': { avgPts: 21.9, gp: 17, totalPts: 373.1 } }, // Jonathan Taylor
    p38: { '2025': { avgPts: 17.8, gp: 17, totalPts: 302.2 }, '2024': { avgPts: 16.7, gp: 16, totalPts: 266.7 }, '2023': { avgPts: 13.7, gp: 17, totalPts: 232.7 }, '2022': { avgPts: 6.6, gp: 16, totalPts: 105.7 } }, // James Cook
    p39: { '2025': { avgPts: 16.6, gp: 17, totalPts: 282.6 }, '2024': { avgPts: 15.9, gp: 16, totalPts: 255.0 }, '2023': { avgPts: 4.5, gp: 12, totalPts: 53.5 } }, // Chase Brown
    p40: { '2025': { avgPts: 16.4, gp: 17, totalPts: 279.5 }, '2024': { avgPts: 19.8, gp: 17, totalPts: 336.4 }, '2023': { avgPts: 14.5, gp: 17, totalPts: 246.7 }, '2022': { avgPts: 18.9, gp: 16, totalPts: 302.8 }, '2021': { avgPts: 24.2, gp: 8, totalPts: 193.3 } }, // Derrick Henry
    p41: { '2025': { avgPts: 16.0, gp: 8, totalPts: 127.7 } }, // Cam Skattebo
    p42: { '2025': { avgPts: 15.8, gp: 15, totalPts: 237.1 }, '2024': { avgPts: 17.2, gp: 17, totalPts: 293.1 }, '2023': { avgPts: 13.9, gp: 13, totalPts: 181.1 }, '2022': { avgPts: 19.3, gp: 17, totalPts: 328.3 }, '2021': { avgPts: 15.1, gp: 15, totalPts: 226.0 } }, // Josh Jacobs
    p43: { '2025': { avgPts: 15.5, gp: 17, totalPts: 263.3 }, '2024': { avgPts: 17.0, gp: 16, totalPts: 272.1 }, '2023': { avgPts: 21.2, gp: 12, totalPts: 255.0 }, '2022': { avgPts: 3.8, gp: 8, totalPts: 30.5 } }, // Kyren Williams
    p44: { '2025': { avgPts: 15.2, gp: 16, totalPts: 242.8 }, '2024': { avgPts: 9.3, gp: 17, totalPts: 157.9 }, '2023': { avgPts: 11.2, gp: 16, totalPts: 179.2 }, '2022': { avgPts: 10.5, gp: 4, totalPts: 42.0 }, '2021': { avgPts: 12.1, gp: 17, totalPts: 204.9 } }, // Javonte Williams
    p45: { '2025': { avgPts: 15.1, gp: 9, totalPts: 135.7 } }, // Omarion Hampton
    p46: { '2025': { avgPts: 14.9, gp: 17, totalPts: 253.9 }, '2024': { avgPts: 8.7, gp: 15, totalPts: 130.2 }, '2023': { avgPts: 16.6, gp: 17, totalPts: 282.4 }, '2022': { avgPts: 12.1, gp: 17, totalPts: 205.1 } }, // Travis Etienne
    p47: { '2025': { avgPts: 14.5, gp: 16, totalPts: 232.3 }, '2024': { avgPts: 22.2, gp: 16, totalPts: 355.3 }, '2023': { avgPts: 15.9, gp: 14, totalPts: 223.2 }, '2022': { avgPts: 17.8, gp: 16, totalPts: 284.0 }, '2021': { avgPts: 11.4, gp: 13, totalPts: 148.6 } }, // Saquon Barkley
    p48: { '2025': { avgPts: 14.4, gp: 17, totalPts: 245.1 } }, // Ashton Jeanty
    p50: { '2025': { avgPts: 13.8, gp: 10, totalPts: 138.5 }, '2024': { avgPts: 14.4, gp: 17, totalPts: 244.4 } }, // Bucky Irving
    p51: { '2025': { avgPts: 13.6, gp: 16, totalPts: 217.1 }, '2024': { avgPts: 8.3, gp: 15, totalPts: 124.1 }, '2023': { avgPts: 11.6, gp: 17, totalPts: 196.4 }, '2022': { avgPts: 5.8, gp: 16, totalPts: 93.3 } }, // Jaylen Warren
    p52: { '2025': { avgPts: 13.0, gp: 17, totalPts: 221.3 }, '2024': { avgPts: 3.7, gp: 17, totalPts: 62.6 }, '2023': { avgPts: 6.1, gp: 16, totalPts: 97.4 }, '2022': { avgPts: 5.2, gp: 17, totalPts: 87.9 }, '2021': { avgPts: 7.7, gp: 16, totalPts: 123.4 } }, // Kenneth Gainwell
    p53: { '2025': { avgPts: 13.0, gp: 16, totalPts: 207.7 }, '2024': { avgPts: 15.1, gp: 16, totalPts: 240.9 }, '2023': { avgPts: 17.1, gp: 17, totalPts: 290.5 }, '2022': { avgPts: 16.4, gp: 7, totalPts: 115.1 } }, // Breece Hall
    p54: { '2025': { avgPts: 12.8, gp: 14, totalPts: 178.8 }, '2024': { avgPts: 11.7, gp: 15, totalPts: 175.9 }, '2023': { avgPts: 12.1, gp: 12, totalPts: 145.7 }, '2022': { avgPts: 14.7, gp: 17, totalPts: 249.1 }, '2021': { avgPts: 9.6, gp: 12, totalPts: 114.9 } }, // Rhamondre Stevenson
    p55: { '2025': { avgPts: 12.7, gp: 17, totalPts: 216.3 }, '2024': { avgPts: 12.4, gp: 16, totalPts: 197.8 }, '2023': { avgPts: 5.7, gp: 16, totalPts: 91.5 }, '2022': { avgPts: 0.0, gp: 2, totalPts: 0.0 } }, // Rico Dowdle
    p56: { '2025': { avgPts: 12.2, gp: 17, totalPts: 206.6 } }, // RJ Harvey
    p57: { '2025': { avgPts: 12.1, gp: 17, totalPts: 206.2 } }, // TreVeyon Henderson
    p58: { '2025': { avgPts: 12.1, gp: 14, totalPts: 169.8 } }, // Quinshon Judkins
    p59: { '2025': { avgPts: 11.6, gp: 10, totalPts: 115.9 }, '2024': { avgPts: 14.8, gp: 13, totalPts: 191.8 }, '2023': { avgPts: 11.7, gp: 1, totalPts: 11.7 }, '2022': { avgPts: 10.2, gp: 8, totalPts: 81.2 } }, // J.K. Dobbins
    p60: { '2025': { avgPts: 11.3, gp: 17, totalPts: 191.9 }, '2024': { avgPts: 16.5, gp: 11, totalPts: 181.2 }, '2023': { avgPts: 13.3, gp: 15, totalPts: 199.4 }, '2022': { avgPts: 13.5, gp: 15, totalPts: 202.5 } }, // Kenneth Walker III
    p61: { '2025': { avgPts: 11.3, gp: 16, totalPts: 181.4 }, '2024': { avgPts: 11.0, gp: 17, totalPts: 186.9 }, '2023': { avgPts: 6.6, gp: 16, totalPts: 106.1 } }, // Zach Charbonnet
    p62: { '2025': { avgPts: 11.1, gp: 3, totalPts: 33.3 }, '2024': { avgPts: 15.9, gp: 16, totalPts: 253.8 }, '2023': { avgPts: 15.5, gp: 13, totalPts: 201.5 }, '2022': { avgPts: 15.4, gp: 13, totalPts: 200.2 }, '2021': { avgPts: 17.2, gp: 15, totalPts: 257.7 } }, // James Conner
    p63: { '2025': { avgPts: 10.9, gp: 17, totalPts: 185.8 }, '2024': { avgPts: 12.5, gp: 16, totalPts: 200.7 }, '2023': { avgPts: 13.1, gp: 17, totalPts: 222.6 }, '2022': { avgPts: 15.6, gp: 16, totalPts: 248.8 }, '2021': { avgPts: 10.8, gp: 15, totalPts: 162.6 } }, // Tony Pollard
    p64: { '2025': { avgPts: 10.7, gp: 15, totalPts: 160.8 }, '2024': { avgPts: 10.7, gp: 17, totalPts: 182.3 } }, // Tyrone Tracy Jr.
    p65: { '2025': { avgPts: 9.9, gp: 12, totalPts: 118.7 }, '2024': { avgPts: 14.2, gp: 17, totalPts: 241.6 }, '2023': { avgPts: 12.3, gp: 11, totalPts: 134.9 }, '2022': { avgPts: 14.6, gp: 17, totalPts: 248.6 }, '2021': { avgPts: 15.3, gp: 15, totalPts: 229.0 } }, // Aaron Jones
    p66: { '2025': { avgPts: 9.8, gp: 17, totalPts: 166.9 }, '2024': { avgPts: 15.8, gp: 14, totalPts: 221.7 }, '2023': { avgPts: 14.8, gp: 14, totalPts: 207.2 }, '2022': { avgPts: 11.1, gp: 16, totalPts: 177.7 }, '2021': { avgPts: 15.0, gp: 13, totalPts: 195.0 } }, // David Montgomery
    p67: { '2025': { avgPts: 9.6, gp: 5, totalPts: 48.1 }, '2024': { avgPts: 3.7, gp: 13, totalPts: 48.7 } }, // Audric Estim√©
    p68: { '2025': { avgPts: 9.2, gp: 11, totalPts: 100.7 }, '2024': { avgPts: 18.9, gp: 14, totalPts: 265.3 }, '2023': { avgPts: 17.9, gp: 13, totalPts: 233.0 }, '2022': { avgPts: 14.1, gp: 15, totalPts: 211.7 }, '2021': { avgPts: 18.1, gp: 13, totalPts: 234.7 } }, // Alvin Kamara
    p69: { '2025': { avgPts: 9.1, gp: 13, totalPts: 117.9 }, '2024': { avgPts: 3.6, gp: 9, totalPts: 32.7 } }, // Kimani Vidal
    p70: { '2025': { avgPts: 9.1, gp: 16, totalPts: 145.1 } }, // Woody Marks
    p71: { '2025': { avgPts: 8.8, gp: 4, totalPts: 35.4 }, '2024': { avgPts: 3.9, gp: 12, totalPts: 47.0 } }, // Trey Benson
    p72: { '2025': { avgPts: 8.6, gp: 17, totalPts: 145.4 }, '2024': { avgPts: 12.0, gp: 13, totalPts: 155.4 }, '2023': { avgPts: 7.9, gp: 15, totalPts: 118.5 }, '2022': { avgPts: 7.5, gp: 17, totalPts: 126.8 }, '2021': { avgPts: 13.8, gp: 8, totalPts: 110.0 } }, // Kareem Hunt
    p73: { '2025': { avgPts: 8.6, gp: 13, totalPts: 111.7 }, '2024': { avgPts: 9.5, gp: 12, totalPts: 113.6 }, '2023': { avgPts: 9.0, gp: 17, totalPts: 153.8 } }, // Tyjae Spears
    p74: { '2025': { avgPts: 8.6, gp: 17, totalPts: 146.7 } }, // Kyle Monangai
    p75: { '2025': { avgPts: 8.4, gp: 15, totalPts: 125.4 }, '2024': { avgPts: 16.1, gp: 15, totalPts: 241.6 }, '2023': { avgPts: 10.7, gp: 17, totalPts: 182.5 }, '2022': { avgPts: 6.4, gp: 14, totalPts: 89.7 }, '2021': { avgPts: 8.6, gp: 16, totalPts: 137.6 } }, // Chuba Hubbard
    p76: { '2025': { avgPts: 8.4, gp: 17, totalPts: 143.0 }, '2024': { avgPts: 13.3, gp: 15, totalPts: 199.6 }, '2023': { avgPts: 15.8, gp: 17, totalPts: 267.9 }, '2022': { avgPts: 8.3, gp: 17, totalPts: 141.1 } }, // Rachaad White
    p77: { '2025': { avgPts: 8.3, gp: 17, totalPts: 140.3 } }, // Jacory Croskey-Merritt
    p78: { '2025': { avgPts: 8.1, gp: 16, totalPts: 128.9 }, '2024': { avgPts: 9.6, gp: 12, totalPts: 115.0 }, '2023': { avgPts: 2.8, gp: 16, totalPts: 44.7 }, '2022': { avgPts: 2.6, gp: 12, totalPts: 31.8 } }, // Jordan Mason
    p79: { '2025': { avgPts: 7.7, gp: 12, totalPts: 92.9 }, '2023': { avgPts: 1.6, gp: 2, totalPts: 3.1 }, '2022': { avgPts: 8.4, gp: 7, totalPts: 59.0 } }, // Bam Knight
    p80: { '2025': { avgPts: 7.7, gp: 12, totalPts: 92.0 }, '2024': { avgPts: 4.5, gp: 7, totalPts: 31.5 }, '2023': { avgPts: 4.2, gp: 9, totalPts: 37.9 } }, // Chris Rodriguez Jr.
    p81: { '2025': { avgPts: 7.6, gp: 13, totalPts: 99.0 }, '2024': { avgPts: 11.9, gp: 3, totalPts: 35.8 }, '2023': { avgPts: 3.9, gp: 15, totalPts: 58.8 }, '2022': { avgPts: 7.9, gp: 16, totalPts: 126.0 }, '2021': { avgPts: 11.0, gp: 14, totalPts: 154.4 } }, // Michael Carter
    p82: { '2025': { avgPts: 7.4, gp: 4, totalPts: 29.7 } }, // Jawhar Jordan
    p83: { '2025': { avgPts: 7.2, gp: 17, totalPts: 123.0 }, '2024': { avgPts: 6.2, gp: 17, totalPts: 106.2 }, '2023': { avgPts: 8.1, gp: 17, totalPts: 137.6 }, '2022': { avgPts: 10.0, gp: 16, totalPts: 159.4 } }, // Tyler Allgeier
    p84: { '2025': { avgPts: 7.2, gp: 17, totalPts: 122.2 }, '2024': { avgPts: 2.2, gp: 15, totalPts: 33.5 } }, // Blake Corum
    p85: { '2025': { avgPts: 6.7, gp: 4, totalPts: 26.7 }, '2024': { avgPts: 7.0, gp: 11, totalPts: 77.3 }, '2023': { avgPts: 5.5, gp: 16, totalPts: 87.6 }, '2022': { avgPts: 12.7, gp: 17, totalPts: 216.7 }, '2021': { avgPts: 9.8, gp: 12, totalPts: 117.2 } }, // Miles Sanders
    p86: { '2025': { avgPts: 6.7, gp: 13, totalPts: 87.3 }, '2024': { avgPts: 8.1, gp: 7, totalPts: 56.9 }, '2023': { avgPts: 15.3, gp: 14, totalPts: 213.9 }, '2022': { avgPts: 7.9, gp: 17, totalPts: 135.0 } }, // Isiah Pacheco
    p87: { '2025': { avgPts: 6.7, gp: 9, totalPts: 60.0 } }, // Devin Neal
    p88: { '2025': { avgPts: 6.5, gp: 10, totalPts: 65.2 }, '2024': { avgPts: 8.5, gp: 15, totalPts: 127.1 }, '2023': { avgPts: 6.8, gp: 16, totalPts: 109.3 }, '2022': { avgPts: 2.8, gp: 15, totalPts: 42.0 } }, // Justice Hill
    p89: { '2025': { avgPts: 6.4, gp: 17, totalPts: 108.8 }, '2024': { avgPts: 6.4, gp: 15, totalPts: 96.6 }, '2023': { avgPts: 9.8, gp: 17, totalPts: 167.3 }, '2022': { avgPts: 11.1, gp: 16, totalPts: 177.9 }, '2021': { avgPts: 11.6, gp: 17, totalPts: 197.8 } }, // Devin Singletary
    p90: { '2025': { avgPts: 5.9, gp: 15, totalPts: 88.3 }, '2024': { avgPts: 7.9, gp: 8, totalPts: 63.3 }, '2023': { avgPts: 11.6, gp: 2, totalPts: 23.1 }, '2022': { avgPts: 16.6, gp: 17, totalPts: 281.4 }, '2021': { avgPts: 15.4, gp: 14, totalPts: 215.3 } }, // Nick Chubb
    p91: { '2025': { avgPts: 5.9, gp: 17, totalPts: 100.3 }, '2024': { avgPts: 5.4, gp: 17, totalPts: 91.7 }, '2023': { avgPts: 3.6, gp: 9, totalPts: 32.4 }, '2022': { avgPts: 3.6, gp: 12, totalPts: 42.8 }, '2021': { avgPts: 7.8, gp: 15, totalPts: 117.0 } }, // Ty Johnson
    p92: { '2025': { avgPts: 5.9, gp: 15, totalPts: 88.6 } }, // Bhayshul Tuten
    p93: { '2025': { avgPts: 5.8, gp: 15, totalPts: 87.6 } }, // Dylan Sampson
    p94: { '2025': { avgPts: 5.6, gp: 17, totalPts: 94.5 }, '2024': { avgPts: 5.6, gp: 17, totalPts: 96.0 }, '2023': { avgPts: 3.0, gp: 5, totalPts: 14.8 } }, // Emanuel Wilson
    p95: { '2025': { avgPts: 5.4, gp: 17, totalPts: 91.4 }, '2024': { avgPts: 4.0, gp: 17, totalPts: 68.7 }, '2023': { avgPts: 1.7, gp: 3, totalPts: 5.2 } }, // Sean Tucker
    p96: { '2025': { avgPts: 5.4, gp: 9, totalPts: 48.2 }, '2024': { avgPts: 2.1, gp: 13, totalPts: 26.7 } }, // Jaylen Wright
    p97: { '2025': { avgPts: 5.2, gp: 15, totalPts: 77.9 }, '2024': { avgPts: 4.8, gp: 17, totalPts: 81.4 }, '2023': { avgPts: 7.1, gp: 17, totalPts: 121.3 }, '2022': { avgPts: 8.9, gp: 16, totalPts: 142.1 }, '2021': { avgPts: 5.5, gp: 15, totalPts: 83.2 } }, // Samaje Perine
    p98: { '2025': { avgPts: 5.1, gp: 4, totalPts: 20.3 } }, // Raheim Sanders
    p99: { '2025': { avgPts: 4.9, gp: 12, totalPts: 58.3 }, '2024': { avgPts: 4.2, gp: 13, totalPts: 54.7 }, '2023': { avgPts: 6.7, gp: 11, totalPts: 73.3 } }, // Emari Demercado
    p100: { '2025': { avgPts: 4.8, gp: 7, totalPts: 33.3 }, '2024': { avgPts: 4.9, gp: 6, totalPts: 29.1 }, '2023': { avgPts: 6.2, gp: 7, totalPts: 43.3 } }, // Kendre Miller
    p101: { '2025': { avgPts: 4.6, gp: 5, totalPts: 23.2 }, '2024': { avgPts: 6.1, gp: 17, totalPts: 103.4 }, '2023': { avgPts: 8.0, gp: 16, totalPts: 127.4 }, '2022': { avgPts: 11.1, gp: 15, totalPts: 165.9 }, '2021': { avgPts: 14.3, gp: 16, totalPts: 229.1 } }, // Antonio Gibson
    p102: { '2025': { avgPts: 4.5, gp: 16, totalPts: 72.7 }, '2024': { avgPts: 4.3, gp: 15, totalPts: 63.8 }, '2023': { avgPts: 0.0, gp: 2, totalPts: 0.0 }, '2021': { avgPts: 5.7, gp: 13, totalPts: 73.6 } }, // Jeremy McNichols
    p103: { '2025': { avgPts: 4.5, gp: 16, totalPts: 71.2 }, '2024': { avgPts: 3.5, gp: 13, totalPts: 45.9 } }, // Isaiah Davis
    p104: { '2025': { avgPts: 4.3, gp: 6, totalPts: 25.7 }, '2022': { avgPts: 3.9, gp: 2, totalPts: 7.8 }, '2021': { avgPts: 3.7, gp: 15, totalPts: 55.9 } }, // Jaret Patterson
    p105: { '2025': { avgPts: 4.3, gp: 13, totalPts: 55.4 }, '2024': { avgPts: 1.7, gp: 4, totalPts: 6.8 }, '2023': { avgPts: 10.0, gp: 7, totalPts: 69.9 } }, // Keaton Mitchell
    p106: { '2025': { avgPts: 4.1, gp: 10, totalPts: 40.6 }, '2023': { avgPts: 0.0, gp: 1, totalPts: 0.0 }, '2022': { avgPts: 5.7, gp: 6, totalPts: 34.4 } }, // Malik Davis
    p107: { '2025': { avgPts: 4.1, gp: 5, totalPts: 20.4 } }, // Jaydon Blue
    p108: { '2025': { avgPts: 3.9, gp: 3, totalPts: 11.6 }, '2024': { avgPts: 12.0, gp: 17, totalPts: 204.6 }, '2023': { avgPts: 11.5, gp: 17, totalPts: 195.5 }, '2022': { avgPts: 13.3, gp: 17, totalPts: 225.5 }, '2021': { avgPts: 17.7, gp: 17, totalPts: 300.7 } }, // Najee Harris
    p109: { '2025': { avgPts: 3.9, gp: 8, totalPts: 31.4 }, '2024': { avgPts: 6.1, gp: 16, totalPts: 97.2 }, '2023': { avgPts: 6.2, gp: 17, totalPts: 106.0 } }, // Jaleel McLaughlin
    p110: { '2025': { avgPts: 3.8, gp: 4, totalPts: 15.3 }, '2024': { avgPts: 5.0, gp: 17, totalPts: 85.2 } }, // Braelon Allen
    p111: { '2025': { avgPts: 3.8, gp: 17, totalPts: 64.1 }, '2024': { avgPts: 6.8, gp: 17, totalPts: 116.1 } }, // Ray Davis
    p112: { '2025': { avgPts: 3.7, gp: 17, totalPts: 62.5 }, '2024': { avgPts: 11.4, gp: 14, totalPts: 159.8 }, '2023': { avgPts: 13.2, gp: 15, totalPts: 198.1 }, '2022': { avgPts: 9.4, gp: 12, totalPts: 112.7 } }, // Brian Robinson
    p113: { '2025': { avgPts: 23.4, gp: 16, totalPts: 375.0 }, '2024': { avgPts: 18.8, gp: 11, totalPts: 206.6 }, '2023': { avgPts: 17.6, gp: 17, totalPts: 298.5 } }, // Puka Nacua
    p114: { '2025': { avgPts: 21.2, gp: 17, totalPts: 359.9 }, '2024': { avgPts: 14.9, gp: 17, totalPts: 253.0 }, '2023': { avgPts: 8.8, gp: 17, totalPts: 149.8 } }, // Jaxon Smith-Njigba
    p116: { '2025': { avgPts: 19.1, gp: 17, totalPts: 324.0 }, '2024': { avgPts: 18.6, gp: 17, totalPts: 316.2 }, '2023': { avgPts: 20.7, gp: 16, totalPts: 330.9 }, '2022': { avgPts: 16.7, gp: 16, totalPts: 267.6 }, '2021': { avgPts: 14.2, gp: 16, totalPts: 227.3 } }, // Amon-Ra St. Brown
    p117: { '2025': { avgPts: 18.8, gp: 8, totalPts: 150.1 }, '2024': { avgPts: 16.2, gp: 4, totalPts: 64.9 }, '2023': { avgPts: 13.3, gp: 16, totalPts: 212.5 } }, // Rashee Rice
    p118: { '2025': { avgPts: 17.2, gp: 17, totalPts: 291.9 }, '2024': { avgPts: 11.7, gp: 14, totalPts: 164.4 }, '2023': { avgPts: 12.3, gp: 17, totalPts: 208.8 }, '2022': { avgPts: 9.8, gp: 17, totalPts: 166.5 } }, // George Pickens
    p119: { '2025': { avgPts: 16.8, gp: 12, totalPts: 201.9 }, '2024': { avgPts: 16.5, gp: 17, totalPts: 280.8 }, '2023': { avgPts: 10.9, gp: 16, totalPts: 174.4 }, '2022': { avgPts: 10.5, gp: 17, totalPts: 178.6 } }, // Drake London
    p120: { '2025': { avgPts: 16.8, gp: 16, totalPts: 268.0 }, '2024': { avgPts: 9.6, gp: 8, totalPts: 76.7 }, '2023': { avgPts: 14.5, gp: 16, totalPts: 231.3 }, '2022': { avgPts: 13.2, gp: 15, totalPts: 198.2 } }, // Chris Olave
    p121: { '2025': { avgPts: 15.9, gp: 14, totalPts: 222.9 }, '2024': { avgPts: 17.2, gp: 14, totalPts: 241.3 }, '2023': { avgPts: 15.6, gp: 17, totalPts: 265.4 }, '2022': { avgPts: 19.7, gp: 17, totalPts: 335.5 }, '2021': { avgPts: 21.5, gp: 16, totalPts: 344.3 } }, // Davante Adams
    p122: { '2025': { avgPts: 15.5, gp: 13, totalPts: 200.9 }, '2024': { avgPts: 17.6, gp: 15, totalPts: 263.4 }, '2023': { avgPts: 23.7, gp: 17, totalPts: 403.2 }, '2022': { avgPts: 17.7, gp: 17, totalPts: 301.6 }, '2021': { avgPts: 14.6, gp: 16, totalPts: 232.8 } }, // CeeDee Lamb
    p123: { '2025': { avgPts: 15.1, gp: 15, totalPts: 226.2 }, '2024': { avgPts: 17.6, gp: 12, totalPts: 210.6 }, '2023': { avgPts: 17.4, gp: 15, totalPts: 260.4 }, '2022': { avgPts: 9.7, gp: 10, totalPts: 97.1 }, '2021': { avgPts: 6.0, gp: 14, totalPts: 83.6 } }, // Nico Collins
    p124: { '2025': { avgPts: 14.7, gp: 15, totalPts: 220.3 }, '2024': { avgPts: 16.7, gp: 13, totalPts: 216.9 }, '2023': { avgPts: 17.0, gp: 17, totalPts: 289.6 }, '2022': { avgPts: 17.6, gp: 17, totalPts: 299.6 }, '2021': { avgPts: 13.9, gp: 13, totalPts: 180.9 } }, // A.J. Brown
    p125: { '2025': { avgPts: 14.3, gp: 17, totalPts: 243.3 }, '2024': { avgPts: 12.3, gp: 17, totalPts: 209.5 }, '2023': { avgPts: 12.9, gp: 16, totalPts: 206.4 } }, // Zay Flowers
    p126: { '2025': { avgPts: 14.3, gp: 4, totalPts: 57.1 }, '2024': { avgPts: 18.2, gp: 15, totalPts: 273.6 } }, // Malik Nabers
    p127: { '2025': { avgPts: 14.2, gp: 7, totalPts: 99.5 }, '2024': { avgPts: 14.8, gp: 17, totalPts: 251.9 }, '2023': { avgPts: 12.5, gp: 17, totalPts: 213.2 }, '2022': { avgPts: 12.7, gp: 17, totalPts: 215.7 } }, // Garrett Wilson
    p128: { '2025': { avgPts: 14.1, gp: 15, totalPts: 211.6 }, '2024': { avgPts: 18.5, gp: 12, totalPts: 222.1 }, '2023': { avgPts: 11.5, gp: 12, totalPts: 137.6 }, '2022': { avgPts: 15.8, gp: 14, totalPts: 220.9 }, '2021': { avgPts: 15.7, gp: 14, totalPts: 219.1 } }, // Tee Higgins
    p130: { '2025': { avgPts: 13.4, gp: 4, totalPts: 53.5 }, '2024': { avgPts: 12.8, gp: 17, totalPts: 218.2 }, '2023': { avgPts: 23.5, gp: 16, totalPts: 376.4 }, '2022': { avgPts: 20.1, gp: 17, totalPts: 341.2 }, '2021': { avgPts: 17.4, gp: 17, totalPts: 296.5 } }, // Tyreek Hill
    p131: { '2025': { avgPts: 13.2, gp: 10, totalPts: 132.4 }, '2024': { avgPts: 7.5, gp: 14, totalPts: 105.3 }, '2023': { avgPts: 11.3, gp: 9, totalPts: 101.3 }, '2022': { avgPts: 11.7, gp: 14, totalPts: 164.1 } }, // Christian Watson
    p132: { '2025': { avgPts: 13.2, gp: 13, totalPts: 171.2 }, '2024': { avgPts: 11.6, gp: 15, totalPts: 174.7 }, '2023': { avgPts: 5.5, gp: 17, totalPts: 94.0 } }, // Quentin Johnston
    p133: { '2025': { avgPts: 13.0, gp: 17, totalPts: 220.6 }, '2024': { avgPts: 7.8, gp: 16, totalPts: 124.5 }, '2023': { avgPts: 8.8, gp: 13, totalPts: 114.5 } }, // Michael Wilson
    p134: { '2025': { avgPts: 12.9, gp: 17, totalPts: 219.7 }, '2024': { avgPts: 15.0, gp: 16, totalPts: 240.3 }, '2023': { avgPts: 11.9, gp: 16, totalPts: 190.2 }, '2022': { avgPts: 10.6, gp: 15, totalPts: 159.4 }, '2021': { avgPts: 8.8, gp: 17, totalPts: 150.2 } }, // Courtland Sutton
    p135: { '2025': { avgPts: 12.9, gp: 17, totalPts: 219.9 }, '2024': { avgPts: 14.1, gp: 15, totalPts: 212.2 }, '2023': { avgPts: 6.7, gp: 12, totalPts: 80.3 }, '2022': { avgPts: 2.5, gp: 6, totalPts: 15.1 } }, // Jameson Williams
    p136: { '2025': { avgPts: 12.6, gp: 17, totalPts: 213.4 } }, // Tetairoa McMillan
    p137: { '2025': { avgPts: 12.5, gp: 15, totalPts: 187.2 }, '2024': { avgPts: 12.7, gp: 15, totalPts: 191.2 }, '2023': { avgPts: 14.1, gp: 16, totalPts: 225.4 }, '2022': { avgPts: 13.3, gp: 17, totalPts: 226.8 }, '2021': { avgPts: 14.4, gp: 17, totalPts: 244.3 } }, // DK Metcalf
    p138: { '2025': { avgPts: 12.4, gp: 17, totalPts: 210.3 }, '2024': { avgPts: 15.2, gp: 8, totalPts: 121.9 }, '2023': { avgPts: 16.1, gp: 17, totalPts: 273.8 }, '2022': { avgPts: 19.8, gp: 16, totalPts: 316.6 }, '2021': { avgPts: 16.8, gp: 17, totalPts: 285.5 } }, // Stefon Diggs
    p139: { '2025': { avgPts: 12.2, gp: 15, totalPts: 183.3 }, '2024': { avgPts: 10.1, gp: 16, totalPts: 161.4 }, '2023': { avgPts: 5.6, gp: 17, totalPts: 95.4 }, '2022': { avgPts: 7.0, gp: 16, totalPts: 112.3 } }, // Alec Pierce
    p140: { '2025': { avgPts: 12.2, gp: 12, totalPts: 146.1 }, '2024': { avgPts: 8.5, gp: 17, totalPts: 144.9 } }, // Rome Odunze
    p141: { '2025': { avgPts: 12.1, gp: 16, totalPts: 194.1 }, '2024': { avgPts: 10.0, gp: 15, totalPts: 149.6 }, '2023': { avgPts: 14.2, gp: 14, totalPts: 198.6 }, '2022': { avgPts: 15.2, gp: 17, totalPts: 259.2 }, '2021': { avgPts: 15.5, gp: 16, totalPts: 247.8 } }, // Jaylen Waddle
    p142: { '2025': { avgPts: 11.9, gp: 17, totalPts: 202.4 }, '2024': { avgPts: 10.4, gp: 16, totalPts: 165.8 }, '2023': { avgPts: 15.8, gp: 16, totalPts: 252.2 }, '2022': { avgPts: 13.5, gp: 16, totalPts: 216.5 }, '2021': { avgPts: 14.0, gp: 17, totalPts: 238.6 } }, // Michael Pittman
    p143: { '2025': { avgPts: 11.9, gp: 17, totalPts: 201.5 }, '2024': { avgPts: 18.7, gp: 17, totalPts: 317.5 }, '2023': { avgPts: 20.2, gp: 10, totalPts: 202.2 }, '2022': { avgPts: 21.7, gp: 17, totalPts: 368.7 }, '2021': { avgPts: 19.4, gp: 17, totalPts: 330.4 } }, // Justin Jefferson
    p144: { '2025': { avgPts: 11.9, gp: 17, totalPts: 201.8 }, '2024': { avgPts: 15.3, gp: 13, totalPts: 199.4 }, '2023': { avgPts: 14.2, gp: 16, totalPts: 227.6 }, '2022': { avgPts: 15.1, gp: 17, totalPts: 256.6 }, '2021': { avgPts: 10.9, gp: 17, totalPts: 185.6 } }, // DeVonta Smith
    p145: { '2025': { avgPts: 11.8, gp: 16, totalPts: 188.2 }, '2024': { avgPts: 10.4, gp: 15, totalPts: 155.6 }, '2023': { avgPts: 16.2, gp: 15, totalPts: 243.7 }, '2022': { avgPts: 13.0, gp: 13, totalPts: 168.4 }, '2021': { avgPts: 21.2, gp: 16, totalPts: 339.0 } }, // Deebo Samuel Sr.
    p146: { '2025': { avgPts: 11.6, gp: 15, totalPts: 173.3 }, '2024': { avgPts: 14.0, gp: 15, totalPts: 210.5 }, '2023': { avgPts: 4.0, gp: 13, totalPts: 51.5 }, '2022': { avgPts: 5.2, gp: 16, totalPts: 82.6 }, '2021': { avgPts: 6.3, gp: 13, totalPts: 82.2 } }, // Jauan Jennings
    p147: { '2025': { avgPts: 11.5, gp: 16, totalPts: 184.7 }, '2024': { avgPts: 6.9, gp: 14, totalPts: 97.0 }, '2023': { avgPts: 4.9, gp: 8, totalPts: 39.2 } }, // Parker Washington
    p148: { '2025': { avgPts: 11.5, gp: 17, totalPts: 195.7 } }, // Emeka Egbuka
    p149: { '2025': { avgPts: 11.4, gp: 10, totalPts: 114.2 }, '2024': { avgPts: 15.8, gp: 17, totalPts: 267.8 }, '2023': { avgPts: 12.0, gp: 17, totalPts: 203.2 }, '2022': { avgPts: 13.5, gp: 17, totalPts: 229.0 }, '2021': { avgPts: 12.6, gp: 17, totalPts: 213.5 } }, // Terry McLaurin
    p150: { '2025': { avgPts: 11.3, gp: 16, totalPts: 180.9 }, '2024': { avgPts: 15.1, gp: 16, totalPts: 240.9 } }, // Ladd McConkey
    p151: { '2025': { avgPts: 11.0, gp: 16, totalPts: 175.8 }, '2024': { avgPts: 14.5, gp: 15, totalPts: 218.0 }, '2023': { avgPts: 13.7, gp: 16, totalPts: 218.6 }, '2022': { avgPts: 13.0, gp: 14, totalPts: 182.3 }, '2021': { avgPts: 11.6, gp: 16, totalPts: 186.3 } }, // Jakobi Meyers
    p152: { '2025': { avgPts: 10.7, gp: 17, totalPts: 182.7 }, '2024': { avgPts: 12.3, gp: 15, totalPts: 184.4 }, '2023': { avgPts: 21.5, gp: 13, totalPts: 278.9 }, '2022': { avgPts: 16.4, gp: 10, totalPts: 164.0 }, '2021': { avgPts: 16.1, gp: 16, totalPts: 257.8 } }, // Keenan Allen
    p153: { '2025': { avgPts: 10.7, gp: 12, totalPts: 127.8 }, '2024': { avgPts: 11.6, gp: 17, totalPts: 196.5 } }, // Marvin Harrison Jr.
    p154: { '2025': { avgPts: 10.6, gp: 8, totalPts: 84.8 }, '2024': { avgPts: 17.2, gp: 14, totalPts: 240.4 }, '2023': { avgPts: 16.6, gp: 17, totalPts: 282.5 }, '2022': { avgPts: 15.0, gp: 15, totalPts: 225.4 }, '2021': { avgPts: 16.4, gp: 16, totalPts: 262.5 } }, // Mike Evans
    p155: { '2025': { avgPts: 10.4, gp: 16, totalPts: 166.4 }, '2024': { avgPts: 12.2, gp: 15, totalPts: 182.5 }, '2023': { avgPts: 7.1, gp: 16, totalPts: 113.1 }, '2022': { avgPts: 3.4, gp: 10, totalPts: 34.1 } }, // Khalil Shakir
    p156: { '2025': { avgPts: 10.4, gp: 17, totalPts: 177.1 }, '2024': { avgPts: 4.2, gp: 16, totalPts: 67.1 } }, // Troy Franklin
    p157: { '2025': { avgPts: 10.3, gp: 16, totalPts: 165.4 }, '2024': { avgPts: 10.2, gp: 13, totalPts: 132.1 }, '2023': { avgPts: 10.3, gp: 17, totalPts: 174.4 }, '2022': { avgPts: 7.8, gp: 13, totalPts: 101.6 } }, // Romeo Doubs
    p158: { '2025': { avgPts: 10.1, gp: 17, totalPts: 172.2 }, '2024': { avgPts: 14.0, gp: 17, totalPts: 238.1 }, '2023': { avgPts: 16.9, gp: 17, totalPts: 286.5 }, '2022': { avgPts: 11.7, gp: 17, totalPts: 199.1 }, '2021': { avgPts: 14.0, gp: 17, totalPts: 237.5 } }, // DJ Moore
    p159: { '2025': { avgPts: 9.9, gp: 14, totalPts: 138.8 }, '2024': { avgPts: 16.7, gp: 17, totalPts: 284.0 } }, // Brian Thomas Jr.
    p160: { '2025': { avgPts: 9.8, gp: 9, totalPts: 88.6 }, '2024': { avgPts: 8.5, gp: 11, totalPts: 93.5 } }, // Ricky Pearsall
    p161: { '2025': { avgPts: 9.7, gp: 14, totalPts: 135.1 }, '2024': { avgPts: 14.2, gp: 15, totalPts: 212.5 }, '2023': { avgPts: 13.0, gp: 17, totalPts: 221.3 } }, // Jordan Addison
    p162: { '2025': { avgPts: 9.7, gp: 5, totalPts: 48.5 }, '2024': { avgPts: 11.6, gp: 17, totalPts: 197.0 }, '2023': { avgPts: 13.6, gp: 16, totalPts: 217.2 } }, // Jayden Reed
    p163: { '2025': { avgPts: 9.5, gp: 17, totalPts: 161.7 }, '2024': { avgPts: 7.6, gp: 17, totalPts: 129.3 }, '2023': { avgPts: 5.5, gp: 13, totalPts: 71.8 } }, // Tre Tucker
    p164: { '2025': { avgPts: 9.2, gp: 9, totalPts: 83.0 }, '2024': { avgPts: 19.7, gp: 7, totalPts: 137.8 }, '2023': { avgPts: 12.3, gp: 17, totalPts: 209.2 }, '2022': { avgPts: 14.9, gp: 15, totalPts: 222.8 }, '2021': { avgPts: 17.3, gp: 14, totalPts: 242.4 } }, // Chris Godwin Jr.
    p165: { '2025': { avgPts: 9.1, gp: 7, totalPts: 63.8 } }, // Travis Hunter
    p166: { '2025': { avgPts: 8.9, gp: 14, totalPts: 124.1 }, '2024': { avgPts: 8.1, gp: 15, totalPts: 121.9 }, '2023': { avgPts: 1.3, gp: 3, totalPts: 3.9 } }, // Kayshon Boutte
    p167: { '2025': { avgPts: 8.7, gp: 18, totalPts: 156.6 }, '2024': { avgPts: 13.6, gp: 6, totalPts: 81.8 }, '2023': { avgPts: 10.5, gp: 15, totalPts: 157.6 }, '2022': { avgPts: 8.4, gp: 12, totalPts: 100.5 } }, // Rashid Shaheed
    p168: { '2025': { avgPts: 8.7, gp: 16, totalPts: 138.4 }, '2024': { avgPts: 13.1, gp: 14, totalPts: 183.5 }, '2023': { avgPts: 9.2, gp: 17, totalPts: 157.1 } }, // Josh Downs
    p169: { '2025': { avgPts: 8.6, gp: 16, totalPts: 137.7 }, '2024': { avgPts: 9.1, gp: 2, totalPts: 18.1 }, '2023': { avgPts: 10.4, gp: 13, totalPts: 134.7 }, '2022': { avgPts: 13.0, gp: 12, totalPts: 156.0 }, '2021': { avgPts: 14.3, gp: 16, totalPts: 228.3 } }, // Marquise Brown
    p170: { '2025': { avgPts: 8.6, gp: 3, totalPts: 25.9 } }, // Theo Wease Jr.
    p171: { '2025': { avgPts: 8.5, gp: 12, totalPts: 102.4 }, '2024': { avgPts: 8.6, gp: 13, totalPts: 111.5 } }, // Keon Coleman
    p172: { '2025': { avgPts: 8.5, gp: 15, totalPts: 127.9 } }, // Luther Burden III
    p173: { '2025': { avgPts: 8.2, gp: 11, totalPts: 90.4 }, '2024': { avgPts: 8.4, gp: 11, totalPts: 92.6 } }, // Jalen Coker
    p174: { '2025': { avgPts: 8.1, gp: 14, totalPts: 113.4 }, '2024': { avgPts: 5.8, gp: 17, totalPts: 98.8 }, '2023': { avgPts: 3.6, gp: 12, totalPts: 43.1 }, '2022': { avgPts: 9.1, gp: 17, totalPts: 154.2 }, '2021': { avgPts: 4.0, gp: 15, totalPts: 60.3 } }, // Mack Hollins
    p175: { '2025': { avgPts: 8.1, gp: 8, totalPts: 65.1 } }, // Tory Horton
    p176: { '2025': { avgPts: 7.9, gp: 14, totalPts: 109.9 }, '2024': { avgPts: 11.7, gp: 16, totalPts: 187.2 } }, // Xavier Worthy
    p177: { '2025': { avgPts: 7.6, gp: 15, totalPts: 114.0 }, '2024': { avgPts: 2.0, gp: 9, totalPts: 18.2 } }, // Ryan Flournoy
    p178: { '2025': { avgPts: 7.6, gp: 17, totalPts: 129.5 } }, // Jayden Higgins
    p179: { '2025': { avgPts: 7.5, gp: 4, totalPts: 29.9 }, '2024': { avgPts: 10.4, gp: 13, totalPts: 135.4 } }, // Jalen McMillan
    p180: { '2025': { avgPts: 7.5, gp: 17, totalPts: 128.1 } }, // Chimere Dike
    p181: { '2025': { avgPts: 7.4, gp: 9, totalPts: 66.3 }, '2024': { avgPts: 8.2, gp: 13, totalPts: 106.5 } }, // Devaughn Vele
    p182: { '2025': { avgPts: 7.3, gp: 16, totalPts: 116.3 }, '2024': { avgPts: 14.6, gp: 12, totalPts: 175.0 }, '2023': { avgPts: 13.7, gp: 12, totalPts: 164.4 }, '2022': { avgPts: 22.4, gp: 9, totalPts: 201.4 }, '2021': { avgPts: 25.9, gp: 17, totalPts: 439.5 } }, // Cooper Kupp
    p183: { '2025': { avgPts: 7.3, gp: 16, totalPts: 116.5 } }, // Elic Ayomanor
    p184: { '2025': { avgPts: 7.1, gp: 14, totalPts: 98.8 }, '2024': { avgPts: 6.9, gp: 16, totalPts: 110.0 }, '2023': { avgPts: 8.9, gp: 17, totalPts: 151.0 }, '2022': { avgPts: 9.9, gp: 13, totalPts: 128.4 }, '2021': { avgPts: 5.3, gp: 13, totalPts: 68.6 } }, // Darius Slayton
    p185: { '2025': { avgPts: 7.1, gp: 17, totalPts: 120.7 }, '2024': { avgPts: 14.2, gp: 17, totalPts: 240.9 }, '2023': { avgPts: 8.9, gp: 16, totalPts: 141.8 }, '2022': { avgPts: 13.6, gp: 15, totalPts: 204.2 }, '2021': { avgPts: 8.5, gp: 10, totalPts: 85.0 } }, // Jerry Jeudy
    p186: { '2025': { avgPts: 6.9, gp: 17, totalPts: 116.7 }, '2024': { avgPts: 4.1, gp: 14, totalPts: 56.8 } }, // Malik Washington
    p187: { '2025': { avgPts: 6.8, gp: 7, totalPts: 47.3 }, '2024': { avgPts: 11.7, gp: 17, totalPts: 199.2 }, '2023': { avgPts: 13.5, gp: 17, totalPts: 229.9 }, '2021': { avgPts: 14.2, gp: 5, totalPts: 71.1 } }, // Calvin Ridley
    p188: { '2025': { avgPts: 6.7, gp: 12, totalPts: 80.8 }, '2024': { avgPts: 2.2, gp: 4, totalPts: 8.7 }, '2023': { avgPts: 3.0, gp: 9, totalPts: 27.2 }, '2022': { avgPts: 5.5, gp: 12, totalPts: 66.3 } }, // Tyquan Thornton
    p189: { '2025': { avgPts: 6.6, gp: 14, totalPts: 92.1 }, '2024': { avgPts: 5.4, gp: 12, totalPts: 65.1 }, '2023': { avgPts: 12.5, gp: 8, totalPts: 100.0 }, '2022': { avgPts: 5.5, gp: 16, totalPts: 88.3 }, '2021': { avgPts: 10.6, gp: 17, totalPts: 180.5 } }, // Kendrick Bourne
    p190: { '2025': { avgPts: 6.6, gp: 5, totalPts: 33.0 }, '2024': { avgPts: 3.4, gp: 8, totalPts: 27.0 } }, // Kevin Austin Jr.
    p191: { '2025': { avgPts: 6.3, gp: 13, totalPts: 82.0 }, '2024': { avgPts: 6.2, gp: 13, totalPts: 80.3 }, '2023': { avgPts: 2.2, gp: 10, totalPts: 22.3 }, '2022': { avgPts: 11.5, gp: 3, totalPts: 34.4 }, '2021': { avgPts: 11.1, gp: 7, totalPts: 77.7 } }, // Sterling Shepard
    p192: { '2025': { avgPts: 6.3, gp: 12, totalPts: 75.1 }, '2024': { avgPts: 5.3, gp: 17, totalPts: 90.3 }, '2023': { avgPts: 4.0, gp: 16, totalPts: 64.5 }, '2022': { avgPts: 7.2, gp: 16, totalPts: 115.1 }, '2021': { avgPts: 1.4, gp: 5, totalPts: 6.9 } }, // Greg Dortch
    p193: { '2025': { avgPts: 18.6, gp: 17, totalPts: 315.9 }, '2024': { avgPts: 15.2, gp: 16, totalPts: 243.8 }, '2023': { avgPts: 10.7, gp: 17, totalPts: 181.5 }, '2022': { avgPts: 5.1, gp: 12, totalPts: 61.5 } }, // Trey McBride
    p194: { '2025': { avgPts: 14.7, gp: 11, totalPts: 161.5 }, '2024': { avgPts: 15.8, gp: 15, totalPts: 236.6 }, '2023': { avgPts: 12.7, gp: 16, totalPts: 203.2 }, '2022': { avgPts: 13.4, gp: 15, totalPts: 200.5 }, '2021': { avgPts: 14.1, gp: 14, totalPts: 198.0 } }, // George Kittle
    p195: { '2025': { avgPts: 14.7, gp: 8, totalPts: 117.2 }, '2024': { avgPts: 9.6, gp: 17, totalPts: 163.3 }, '2023': { avgPts: 5.6, gp: 14, totalPts: 78.5 } }, // Tucker Kraft
    p196: { '2025': { avgPts: 14.7, gp: 12, totalPts: 176.2 }, '2024': { avgPts: 15.5, gp: 17, totalPts: 262.7 } }, // Brock Bowers
    p197: { '2025': { avgPts: 12.4, gp: 17, totalPts: 210.8 }, '2024': { avgPts: 7.7, gp: 17, totalPts: 131.2 }, '2023': { avgPts: 8.1, gp: 17, totalPts: 137.3 }, '2022': { avgPts: 7.6, gp: 10, totalPts: 75.6 }, '2021': { avgPts: 10.4, gp: 17, totalPts: 176.6 } }, // Kyle Pitts
    p198: { '2025': { avgPts: 12.3, gp: 15, totalPts: 185.1 }, '2024': { avgPts: 10.4, gp: 10, totalPts: 103.6 }, '2023': { avgPts: 9.7, gp: 14, totalPts: 136.3 }, '2022': { avgPts: 11.8, gp: 12, totalPts: 141.2 }, '2021': { avgPts: 11.0, gp: 15, totalPts: 165.0 } }, // Dallas Goedert
    p199: { '2025': { avgPts: 11.9, gp: 9, totalPts: 106.9 }, '2024': { avgPts: 10.9, gp: 16, totalPts: 174.6 }, '2023': { avgPts: 14.1, gp: 17, totalPts: 239.3 } }, // Sam LaPorta
    p200: { '2025': { avgPts: 11.7, gp: 16, totalPts: 186.4 } }, // Harold Fannin Jr.
    p201: { '2025': { avgPts: 11.4, gp: 17, totalPts: 193.2 }, '2024': { avgPts: 12.2, gp: 16, totalPts: 195.4 }, '2023': { avgPts: 14.6, gp: 15, totalPts: 219.4 }, '2022': { avgPts: 18.6, gp: 17, totalPts: 316.3 }, '2021': { avgPts: 16.4, gp: 16, totalPts: 262.8 } }, // Travis Kelce
    p202: { '2025': { avgPts: 11.1, gp: 17, totalPts: 188.1 }, '2024': { avgPts: 7.5, gp: 14, totalPts: 104.4 }, '2023': { avgPts: 10.4, gp: 17, totalPts: 177.1 }, '2022': { avgPts: 4.4, gp: 11, totalPts: 48.4 } }, // Jake Ferguson
    p203: { '2025': { avgPts: 11.1, gp: 17, totalPts: 188.5 } }, // Tyler Warren
    p204: { '2025': { avgPts: 10.6, gp: 17, totalPts: 179.9 }, '2024': { avgPts: 8.2, gp: 15, totalPts: 122.8 }, '2023': { avgPts: 7.5, gp: 13, totalPts: 97.8 }, '2022': { avgPts: 8.4, gp: 16, totalPts: 134.8 }, '2021': { avgPts: 4.1, gp: 13, totalPts: 52.9 } }, // Juwan Johnson
    p205: { '2025': { avgPts: 10.5, gp: 17, totalPts: 178.8 }, '2024': { avgPts: 9.1, gp: 16, totalPts: 145.4 }, '2023': { avgPts: 9.2, gp: 13, totalPts: 119.9 }, '2022': { avgPts: 6.5, gp: 16, totalPts: 103.9 }, '2021': { avgPts: 10.3, gp: 16, totalPts: 164.3 } }, // Hunter Henry
    p206: { '2025': { avgPts: 10.5, gp: 17, totalPts: 177.7 }, '2024': { avgPts: 7.0, gp: 17, totalPts: 118.2 }, '2023': { avgPts: 10.0, gp: 15, totalPts: 150.5 }, '2022': { avgPts: 9.5, gp: 15, totalPts: 142.7 }, '2021': { avgPts: 12.3, gp: 17, totalPts: 208.8 } }, // Dalton Schultz
    p207: { '2025': { avgPts: 10.5, gp: 12, totalPts: 126.1 }, '2024': { avgPts: 7.8, gp: 13, totalPts: 100.8 }, '2023': { avgPts: 9.4, gp: 16, totalPts: 150.3 } }, // Dalton Kincaid
    p208: { '2025': { avgPts: 10.3, gp: 16, totalPts: 165.1 } }, // Colston Loveland
    p209: { '2025': { avgPts: 9.9, gp: 9, totalPts: 88.7 }, '2023': { avgPts: 9.4, gp: 12, totalPts: 113.2 }, '2022': { avgPts: 10.6, gp: 8, totalPts: 84.8 }, '2021': { avgPts: 12.1, gp: 11, totalPts: 133.5 } }, // Darren Waller
    p210: { '2025': { avgPts: 9.8, gp: 12, totalPts: 118.0 }, '2024': { avgPts: 6.5, gp: 14, totalPts: 91.1 }, '2023': { avgPts: 2.1, gp: 7, totalPts: 14.5 } }, // Brenton Strange
    p211: { '2025': { avgPts: 9.7, gp: 13, totalPts: 126.4 }, '2024': { avgPts: 10.4, gp: 17, totalPts: 177.4 }, '2023': { avgPts: 7.4, gp: 7, totalPts: 51.7 }, '2022': { avgPts: 11.6, gp: 10, totalPts: 115.6 }, '2021': { avgPts: 10.6, gp: 17, totalPts: 180.7 } }, // Zach Ertz
    p212: { '2025': { avgPts: 9.3, gp: 14, totalPts: 129.8 }, '2024': { avgPts: 4.1, gp: 16, totalPts: 65.4 }, '2023': { avgPts: 4.1, gp: 15, totalPts: 61.7 }, '2022': { avgPts: 4.9, gp: 14, totalPts: 69.2 }, '2021': { avgPts: 1.7, gp: 5, totalPts: 8.3 } }, // Colby Parkinson
    p213: { '2025': { avgPts: 9.3, gp: 10, totalPts: 93.3 }, '2024': { avgPts: 0.0, gp: 2, totalPts: 0.0 }, '2022': { avgPts: 0.0, gp: 1, totalPts: 0.0 } }, // Jake Tonges
    p214: { '2025': { avgPts: 8.8, gp: 15, totalPts: 131.4 } }, // Oronde Gadsden II
    p215: { '2025': { avgPts: 8.7, gp: 17, totalPts: 147.3 }, '2024': { avgPts: 5.2, gp: 15, totalPts: 78.5 } }, // AJ Barner
    p216: { '2025': { avgPts: 8.5, gp: 15, totalPts: 127.8 }, '2024': { avgPts: 6.2, gp: 11, totalPts: 68.1 } }, // Theo Johnson
    p217: { '2025': { avgPts: 8.1, gp: 15, totalPts: 122.2 }, '2024': { avgPts: 10.0, gp: 14, totalPts: 140.6 }, '2023': { avgPts: 7.0, gp: 17, totalPts: 118.5 }, '2022': { avgPts: 5.8, gp: 16, totalPts: 93.1 } }, // Cade Otton
    p218: { '2025': { avgPts: 7.8, gp: 11, totalPts: 86.3 }, '2024': { avgPts: 13.5, gp: 11, totalPts: 148.5 }, '2023': { avgPts: 12.6, gp: 16, totalPts: 201.2 }, '2022': { avgPts: 10.1, gp: 14, totalPts: 142.0 }, '2021': { avgPts: 7.2, gp: 15, totalPts: 107.6 } }, // David Njoku
    p219: { '2025': { avgPts: 7.7, gp: 17, totalPts: 131.0 }, '2024': { avgPts: 11.1, gp: 17, totalPts: 188.8 }, '2023': { avgPts: 13.5, gp: 10, totalPts: 135.4 }, '2022': { avgPts: 12.7, gp: 15, totalPts: 190.5 }, '2021': { avgPts: 17.7, gp: 17, totalPts: 301.1 } }, // Mark Andrews
    p220: { '2025': { avgPts: 7.6, gp: 15, totalPts: 113.6 }, '2024': { avgPts: 10.0, gp: 17, totalPts: 170.3 }, '2023': { avgPts: 7.0, gp: 11, totalPts: 76.8 }, '2022': { avgPts: 9.9, gp: 15, totalPts: 148.2 }, '2021': { avgPts: 9.5, gp: 16, totalPts: 151.7 } }, // Pat Freiermuth
    p221: { '2025': { avgPts: 7.5, gp: 15, totalPts: 112.8 }, '2024': { avgPts: 8.7, gp: 10, totalPts: 86.5 }, '2023': { avgPts: 14.6, gp: 15, totalPts: 219.0 }, '2022': { avgPts: 12.8, gp: 17, totalPts: 217.4 }, '2021': { avgPts: 12.1, gp: 12, totalPts: 145.3 } }, // T.J. Hockenson
    p222: { '2025': { avgPts: 7.3, gp: 17, totalPts: 124.0 }, '2024': { avgPts: 7.1, gp: 16, totalPts: 113.6 }, '2023': { avgPts: 6.7, gp: 17, totalPts: 113.4 }, '2022': { avgPts: 6.1, gp: 16, totalPts: 97.2 } }, // Chig Okonkwo
    p223: { '2025': { avgPts: 7.1, gp: 10, totalPts: 71.1 }, '2024': { avgPts: 8.9, gp: 3, totalPts: 26.6 }, '2023': { avgPts: 7.2, gp: 15, totalPts: 108.5 }, '2022': { avgPts: 9.5, gp: 16, totalPts: 152.0 }, '2021': { avgPts: 9.8, gp: 15, totalPts: 147.0 } }, // Tyler Higbee
    p224: { '2025': { avgPts: 7.0, gp: 9, totalPts: 62.8 }, '2024': { avgPts: 1.9, gp: 4, totalPts: 7.8 }, '2023': { avgPts: 2.8, gp: 2, totalPts: 5.5 }, '2022': { avgPts: 8.6, gp: 10, totalPts: 86.1 } }, // Greg Dulcich
    p225: { '2025': { avgPts: 6.8, gp: 13, totalPts: 88.9 } }, // Mason Taylor
    p226: { '2025': { avgPts: 6.5, gp: 16, totalPts: 103.7 }, '2024': { avgPts: 4.2, gp: 14, totalPts: 59.1 }, '2023': { avgPts: 5.5, gp: 10, totalPts: 54.6 }, '2022': { avgPts: 9.0, gp: 15, totalPts: 135.7 }, '2021': { avgPts: 10.9, gp: 15, totalPts: 164.1 } }, // Dawson Knox
    p227: { '2025': { avgPts: 6.4, gp: 16, totalPts: 102.8 }, '2024': { avgPts: 9.9, gp: 9, totalPts: 89.5 }, '2023': { avgPts: 13.5, gp: 17, totalPts: 230.3 }, '2022': { avgPts: 10.4, gp: 17, totalPts: 176.9 }, '2021': { avgPts: 6.8, gp: 15, totalPts: 102.5 } }, // Evan Engram
    p228: { '2025': { avgPts: 5.9, gp: 12, totalPts: 70.7 }, '2024': { avgPts: 8.8, gp: 16, totalPts: 141.5 }, '2023': { avgPts: 4.4, gp: 15, totalPts: 65.4 }, '2022': { avgPts: 5.8, gp: 17, totalPts: 98.2 }, '2021': { avgPts: 9.7, gp: 17, totalPts: 165.0 } }, // Mike Gesicki
    p230: { '2025': { avgPts: 11.9, gp: 17, totalPts: 202 }, '2024': { avgPts: 8.2, gp: 17, totalPts: 140 }, '2023': { avgPts: 9.3, gp: 17, totalPts: 158 }, '2022': { avgPts: 9.4, gp: 17, totalPts: 159 }, '2021': { avgPts: 6.1, gp: 17, totalPts: 104 } }, // Jason Myers
    p231: { '2025': { avgPts: 11.4, gp: 5, totalPts: 57 }, '2024': { avgPts: 6.5, gp: 4, totalPts: 26 } }, // Spencer Shrader
    p232: { '2025': { avgPts: 11.0, gp: 17, totalPts: 187 }, '2024': { avgPts: 11.3, gp: 17, totalPts: 192 }, '2023': { avgPts: 10.6, gp: 17, totalPts: 181 } }, // Brandon Aubrey
    p233: { '2025': { avgPts: 10.7, gp: 9, totalPts: 96 }, '2024': { avgPts: 6.3, gp: 6, totalPts: 38 }, '2021': { avgPts: 8.2, gp: 12, totalPts: 98 } }, // Zane Gonzalez
    p234: { '2025': { avgPts: 10.7, gp: 3, totalPts: 32 } }, // Ben Sauls
    p235: { '2025': { avgPts: 10.0, gp: 14, totalPts: 140 }, '2024': { avgPts: 6.3, gp: 17, totalPts: 107 }, '2023': { avgPts: 7.3, gp: 15, totalPts: 109 }, '2022': { avgPts: 8.6, gp: 17, totalPts: 146 }, '2021': { avgPts: 7.6, gp: 5, totalPts: 38 } }, // Eddy Pineiro
    p236: { '2025': { avgPts: 10.0, gp: 17, totalPts: 170 }, '2024': { avgPts: 10.5, gp: 17, totalPts: 179 }, '2023': { avgPts: 8.9, gp: 17, totalPts: 151 }, '2022': { avgPts: 8.5, gp: 11, totalPts: 94 } }, // Cameron Dicker
    p237: { '2025': { avgPts: 10.0, gp: 6, totalPts: 60 } }, // Charlie Smyth
    p238: { '2025': { avgPts: 9.6, gp: 17, totalPts: 164 }, '2024': { avgPts: 7.4, gp: 17, totalPts: 126 } }, // Cam Little
    p239: { '2025': { avgPts: 9.4, gp: 17, totalPts: 159 }, '2024': { avgPts: 10.1, gp: 13, totalPts: 131 } }, // Will Reichard
    p240: { '2025': { avgPts: 9.2, gp: 17, totalPts: 156 }, '2024': { avgPts: 9.6, gp: 17, totalPts: 164 }, '2023': { avgPts: 8.0, gp: 17, totalPts: 136 }, '2022': { avgPts: 8.6, gp: 16, totalPts: 138 }, '2021': { avgPts: 5.8, gp: 16, totalPts: 93 } }, // Chase McLaughlin
    p241: { '2025': { avgPts: 9.1, gp: 9, totalPts: 82 } }, // Harrison Mevis
    p242: { '2025': { avgPts: 9.0, gp: 9, totalPts: 81 }, '2024': { avgPts: 8.4, gp: 14, totalPts: 118 }, '2023': { avgPts: 7.7, gp: 17, totalPts: 131 } }, // Jake Moody
    p243: { '2025': { avgPts: 8.9, gp: 17, totalPts: 151 }, '2024': { avgPts: 11.2, gp: 17, totalPts: 191 }, '2023': { avgPts: 7.8, gp: 17, totalPts: 133 }, '2022': { avgPts: 8.1, gp: 12, totalPts: 97 }, '2021': { avgPts: 9.5, gp: 17, totalPts: 162 } }, // Chris Boswell
    p244: { '2025': { avgPts: 8.9, gp: 17, totalPts: 152 }, '2024': { avgPts: 9.5, gp: 17, totalPts: 161 } }, // Jake Bates
    p245: { '2025': { avgPts: 8.8, gp: 15, totalPts: 132 }, '2024': { avgPts: 6.4, gp: 17, totalPts: 109 }, '2023': { avgPts: 9.3, gp: 17, totalPts: 158 }, '2022': { avgPts: 6.5, gp: 16, totalPts: 104 }, '2021': { avgPts: 6.8, gp: 17, totalPts: 116 } }, // Cairo Santos
    p246: { '2025': { avgPts: 8.8, gp: 17, totalPts: 149 }, '2024': { avgPts: 7.7, gp: 13, totalPts: 100 }, '2023': { avgPts: 9.1, gp: 17, totalPts: 154 }, '2022': { avgPts: 7.8, gp: 13, totalPts: 102 }, '2021': { avgPts: 8.8, gp: 16, totalPts: 140 } }, // Harrison Butker
    p247: { '2025': { avgPts: 8.8, gp: 17, totalPts: 149 } }, // Andy Borregales
    p248: { '2025': { avgPts: 8.5, gp: 17, totalPts: 144 } }, // Tyler Loop
    p249: { '2025': { avgPts: 8.4, gp: 16, totalPts: 135 }, '2024': { avgPts: 7.1, gp: 17, totalPts: 120 }, '2023': { avgPts: 6.0, gp: 17, totalPts: 102 }, '2022': { avgPts: 6.8, gp: 17, totalPts: 115 }, '2021': { avgPts: 8.3, gp: 12, totalPts: 100 } }, // Joey Slye
    p250: { '2025': { avgPts: 8.1, gp: 14, totalPts: 113 }, '2024': { avgPts: 9.0, gp: 11, totalPts: 99 }, '2023': { avgPts: 8.6, gp: 17, totalPts: 146 }, '2022': { avgPts: 7.9, gp: 17, totalPts: 135 }, '2021': { avgPts: 7.6, gp: 17, totalPts: 129 } }, // Brandon McManus
    p251: { '2025': { avgPts: 8.1, gp: 16, totalPts: 129 }, '2024': { avgPts: 7.7, gp: 17, totalPts: 131 }, '2023': { avgPts: 8.8, gp: 17, totalPts: 150 } }, // Blake Grupe
    p252: { '2025': { avgPts: 8.0, gp: 17, totalPts: 136 }, '2024': { avgPts: 7.8, gp: 12, totalPts: 94 }, '2023': { avgPts: 8.2, gp: 17, totalPts: 140 }, '2022': { avgPts: 8.2, gp: 16, totalPts: 131 }, '2021': { avgPts: 9.6, gp: 16, totalPts: 154 } }, // Evan McPherson
    p253: { '2025': { avgPts: 7.9, gp: 16, totalPts: 127 }, '2024': { avgPts: 7.7, gp: 14, totalPts: 108 }, '2023': { avgPts: 7.7, gp: 17, totalPts: 131 }, '2022': { avgPts: 8.6, gp: 17, totalPts: 146 }, '2021': { avgPts: 10.1, gp: 17, totalPts: 171 } }, // Nick Folk
    p254: { '2025': { avgPts: 7.9, gp: 17, totalPts: 134 }, '2024': { avgPts: 9.4, gp: 17, totalPts: 160 }, '2023': { avgPts: 7.6, gp: 17, totalPts: 129 }, '2022': { avgPts: 6.7, gp: 17, totalPts: 114 } }, // Wil Lutz
    p255: { '2025': { avgPts: 7.8, gp: 5, totalPts: 39 }, '2024': { avgPts: 5.0, gp: 10, totalPts: 50 }, '2023': { avgPts: 6.2, gp: 8, totalPts: 50 }, '2022': { avgPts: 8.5, gp: 17, totalPts: 145 }, '2021': { avgPts: 7.2, gp: 17, totalPts: 123 } }, // Graham Gano
    p256: { '2025': { avgPts: 7.8, gp: 17, totalPts: 132 }, '2024': { avgPts: 6.0, gp: 5, totalPts: 30 }, '2023': { avgPts: 6.2, gp: 15, totalPts: 93 }, '2022': { avgPts: 8.2, gp: 17, totalPts: 140 }, '2021': { avgPts: 8.4, gp: 7, totalPts: 59 } }, // Riley Patterson
    p257: { '2025': { avgPts: 7.6, gp: 12, totalPts: 91 }, '2024': { avgPts: 8.7, gp: 16, totalPts: 139 }, '2023': { avgPts: 9.2, gp: 17, totalPts: 157 }, '2022': { avgPts: 7.8, gp: 17, totalPts: 133 }, '2021': { avgPts: 9.4, gp: 17, totalPts: 159 } }, // Matt Gay
    p258: { '2025': { avgPts: 7.6, gp: 17, totalPts: 130 }, '2024': { avgPts: 9.6, gp: 13, totalPts: 125 }, '2023': { avgPts: 4.8, gp: 17, totalPts: 81 } }, // Chad Ryland
    p259: { '2025': { avgPts: 7.3, gp: 3, totalPts: 22 }, '2023': { avgPts: 7.8, gp: 9, totalPts: 70 } }, // Lucas Havrisik
    p260: { '2025': { avgPts: 7.2, gp: 15, totalPts: 108 }, '2024': { avgPts: 8.2, gp: 4, totalPts: 33 }, '2023': { avgPts: 7.6, gp: 17, totalPts: 130 }, '2022': { avgPts: 7.6, gp: 13, totalPts: 99 }, '2021': { avgPts: 9.1, gp: 17, totalPts: 154 } }, // Matt Prater
  },
  meta: {
    seasons: [2025, 2024, 2023, 2022, 2021],
    scoringFormat: 'ppr',
    lastUpdated: '2026-04-04',
    playerCount: 255,
  },
};