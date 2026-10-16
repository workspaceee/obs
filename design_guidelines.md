{
  "design_system_name": "IMBA Cyber Club OBS Widgets + Panel",
  "brand_attributes": [
    "aggressive esports",
    "precise HUD geometry",
    "neon red energy",
    "high legibility on stream",
    "fast, crisp feedback (no constant blinking)"
  ],
  "critical_obs_requirements": {
    "transparent_background": {
      "rule": "Widgets MUST render with fully transparent page background for OBS Browser Source.",
      "implementation": [
        "Set html, body, #root background: transparent !important",
        "Avoid any full-page wrappers with bg-* Tailwind classes",
        "Only the widget plate/frame uses dark backing (semi-opaque)"
      ]
    },
    "recommended_delivery": {
      "preferred": [
        {
          "option": "OBS Browser Source (local URL)",
          "why": "Best for live updates + hotkeys + preview; supports transparency.",
          "how": [
            "Run app locally (or on LAN) and add Browser Source URL",
            "Enable: 'Shutdown source when not visible' OFF for persistence",
            "Enable: 'Refresh browser when scene becomes active' OFF to avoid resets"
          ]
        }
      ],
      "alternatives": [
        {
          "option": "Local file Browser Source",
          "why": "No server needed; simplest.",
          "notes": [
            "OBS can load file:// URLs; but live API calls/hotkeys still need a local backend or websocket",
            "If used, ensure assets are relative and CORS-safe"
          ]
        },
        {
          "option": "WebM with alpha (for purely decorative animations)",
          "why": "Perfect transparency + performance for non-interactive loops.",
          "notes": [
            "Use only for background sweeps/line wipes; keep widgets HTML for dynamic numbers"
          ]
        }
      ]
    },
    "sizes": {
      "score_widget": {
        "obs_source_size": "600x200",
        "safe_padding": "16px",
        "scale_behavior": "Use CSS container queries or vw-based scaling inside a fixed aspect wrapper; avoid blurry scaling by using vector borders (SVG) or crisp 1px lines with opacity."
      },
      "rank_widget": {
        "obs_source_size": "900x360",
        "safe_padding": "18px",
        "scale_behavior": "Use a 900x360 design grid; allow downscale to 0.75 without losing label legibility."
      }
    }
  },
  "palette": {
    "notes": [
      "No purple gradients. Keep gradients minimal and only as subtle overlays (<20% viewport).",
      "Primary vibe: black + neon red glow + white technical text."
    ],
    "tokens_css_variables": {
      "use_in": "/app/frontend/src/index.css (override :root and .dark)",
      "css": ":root {\n  /* OBS widgets: keep page transparent; these tokens are for plates/panel */\n  --imba-bg: 0 0% 6%;            /* near-black */\n  --imba-bg-2: 0 0% 9%;\n  --imba-fg: 0 0% 98%;\n  --imba-muted: 0 0% 72%;\n  --imba-muted-2: 0 0% 55%;\n\n  --imba-red: 353 100% 55%;      /* ~#ff1a2e */\n  --imba-red-2: 353 100% 62%;\n  --imba-red-dim: 353 80% 40%;\n\n  --imba-line: 0 0% 100% / 0.10;\n  --imba-line-strong: 0 0% 100% / 0.18;\n\n  --background: 0 0% 6%;\n  --foreground: 0 0% 98%;\n  --card: 0 0% 8%;\n  --card-foreground: 0 0% 98%;\n  --popover: 0 0% 8%;\n  --popover-foreground: 0 0% 98%;\n\n  --primary: 353 100% 55%;\n  --primary-foreground: 0 0% 98%;\n  --secondary: 0 0% 12%;\n  --secondary-foreground: 0 0% 98%;\n  --muted: 0 0% 12%;\n  --muted-foreground: 0 0% 70%;\n  --accent: 0 0% 14%;\n  --accent-foreground: 0 0% 98%;\n  --destructive: 353 100% 55%;\n  --destructive-foreground: 0 0% 98%;\n  --border: 0 0% 100% / 0.10;\n  --input: 0 0% 100% / 0.12;\n  --ring: 353 100% 55%;\n\n  --radius: 12px;\n\n  /* glow + shadow */\n  --imba-glow: 0 0 18px hsl(var(--imba-red) / 0.35), 0 0 42px hsl(var(--imba-red) / 0.18);\n  --imba-glow-tight: 0 0 10px hsl(var(--imba-red) / 0.35);\n  --imba-shadow: 0 18px 60px rgba(0,0,0,0.55);\n}\n\n.dark {\n  /* keep same; panel is dark-first */\n}\n"
    },
    "allowed_gradients": {
      "rule": "Only subtle red-on-black overlays; never on text-heavy areas; never >20% viewport.",
      "examples": [
        "background: radial-gradient(1200px 400px at 20% 0%, rgba(255,26,46,0.18), transparent 60%)",
        "background: linear-gradient(90deg, rgba(255,26,46,0.10), transparent 35%, rgba(255,26,46,0.06))"
      ]
    }
  },
  "typography": {
    "google_fonts": {
      "heading": {
        "family": "Chakra Petch",
        "weights": [400, 500, 600, 700],
        "why": "Wide, technical, esports HUD feel; readable at small sizes."
      },
      "body": {
        "family": "Inter",
        "weights": [400, 500, 600],
        "why": "Panel UI clarity; pairs well with Chakra Petch."
      },
      "numeric": {
        "family": "Chakra Petch",
        "feature_settings": "'tnum' 1, 'ss01' 1",
        "why": "Tabular numbers reduce jitter in counters."
      }
    },
    "tailwind_usage": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg text-muted-foreground",
      "widget_labels": "text-[11px] tracking-[0.22em] uppercase text-white/80",
      "widget_numbers": "text-[44px] leading-none font-bold tracking-tight",
      "panel_body": "text-sm md:text-base text-white/90"
    }
  },
  "layout_and_grid": {
    "panel": {
      "structure": [
        "Top bar: brand + connection status pill + OBS quick links",
        "Main: Tabs (Счёт / Звание / Клавиши / OBS)",
        "Two-column on desktop: left controls, right live preview card",
        "Single-column on mobile: preview first, then controls"
      ],
      "grid": {
        "desktop": "grid grid-cols-12 gap-6",
        "left": "col-span-12 lg:col-span-7",
        "right": "col-span-12 lg:col-span-5"
      },
      "spacing": {
        "rule": "Use 2–3x more spacing than default; avoid cramped HUD controls.",
        "tokens": {
          "section": "py-6 md:py-8",
          "card": "p-4 md:p-6",
          "stack": "space-y-3 md:space-y-4"
        }
      }
    },
    "widgets": {
      "rule": "Design at exact OBS source size; scale down with transform: scale() only at the outermost wrapper if needed.",
      "score": {
        "grid": "3 blocks: WIN | center STREAK | LOSE",
        "alignment": "Numbers baseline-aligned; labels above; streak muted when none"
      },
      "rank": {
        "grid": "CURRENT frame (left) + chevron lane (center) + GOAL frame (right)",
        "alignment": "Labels above frames; rank name + stars below medal"
      }
    }
  },
  "component_path": {
    "shadcn_primary": [
      "/app/frontend/src/components/ui/button.jsx",
      "/app/frontend/src/components/ui/card.jsx",
      "/app/frontend/src/components/ui/tabs.jsx",
      "/app/frontend/src/components/ui/input.jsx",
      "/app/frontend/src/components/ui/label.jsx",
      "/app/frontend/src/components/ui/dialog.jsx",
      "/app/frontend/src/components/ui/alert-dialog.jsx",
      "/app/frontend/src/components/ui/separator.jsx",
      "/app/frontend/src/components/ui/scroll-area.jsx",
      "/app/frontend/src/components/ui/badge.jsx",
      "/app/frontend/src/components/ui/tooltip.jsx",
      "/app/frontend/src/components/ui/switch.jsx",
      "/app/frontend/src/components/ui/sonner.jsx"
    ],
    "panel_patterns": {
      "confirm_reset": "alert-dialog.jsx",
      "copy_url_toast": "sonner.jsx",
      "hotkey_recorder": "input.jsx + badge.jsx + tooltip.jsx",
      "medal_picker": "tabs.jsx + scroll-area.jsx + button.jsx (ghost)"
    }
  },
  "widget_visual_language": {
    "geometry": {
      "chamfer_clip_paths": {
        "plate": "clip-path: polygon(0% 10px, 10px 0%, calc(100% - 18px) 0%, 100% 18px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0% calc(100% - 10px));",
        "inner_plate": "clip-path: polygon(0% 8px, 8px 0%, calc(100% - 14px) 0%, 100% 14px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0% calc(100% - 8px));"
      },
      "line_weights": {
        "hairline": "1px solid rgba(255,255,255,0.10)",
        "accent": "1px solid rgba(255,26,46,0.55)",
        "accent_strong": "2px solid rgba(255,26,46,0.75)"
      },
      "ticks_and_dashes": {
        "pattern": "Use repeating-linear-gradient for micro ticks on edges.",
        "css": "background-image: repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 6px, transparent 6px 14px); background-size: 100% 1px; background-repeat: no-repeat; background-position: 0 10px;"
      }
    },
    "plate_backing": {
      "rule": "Widget plate uses dark backing; page stays transparent.",
      "css": "background: rgba(10,10,12,0.72); backdrop-filter: blur(6px); box-shadow: var(--imba-shadow);"
    },
    "glow": {
      "text_shadow": "text-shadow: 0 0 10px rgba(255,26,46,0.35), 0 0 22px rgba(255,26,46,0.18);",
      "border_glow": "box-shadow: 0 0 0 1px rgba(255,26,46,0.35) inset, 0 0 18px rgba(255,26,46,0.18);"
    },
    "noise_and_texture": {
      "rule": "Use subtle CSS noise overlay on plates only (not full page).",
      "css": ".imba-noise::after{content:'';position:absolute;inset:0;pointer-events:none;opacity:.10;background-image:url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"2\" stitchTiles=\"stitch\"/></filter><rect width=\"120\" height=\"120\" filter=\"url(%23n)\" opacity=\"0.35\"/></svg>');mix-blend-mode:overlay;border-radius:inherit;clip-path:inherit;}"
    }
  },
  "motion_and_microinteractions": {
    "principles": [
      "Short, crisp: 120–220ms for flashes; 260–420ms for flips",
      "No constant blinking; only calm chevron flow allowed",
      "Prefer transform/opacity animations; avoid layout thrash"
    ],
    "keyframes_css": {
      "neon_flash": "@keyframes imbaFlash {0%{filter:drop-shadow(0 0 0 rgba(255,26,46,0));}35%{filter:drop-shadow(0 0 14px rgba(255,26,46,0.55));}100%{filter:drop-shadow(0 0 0 rgba(255,26,46,0));}}",
      "glitch_in": "@keyframes imbaGlitchIn {0%{opacity:0;transform:translateY(6px) skewX(-6deg);}40%{opacity:1;transform:translateY(0) skewX(0);}55%{transform:translateX(-2px);}70%{transform:translateX(2px);}100%{transform:translateX(0);}}",
      "digit_flip": "@keyframes imbaDigitFlip {0%{transform:translateY(0);}100%{transform:translateY(-10%);}}",
      "chevron_flow": "@keyframes imbaChevron {0%{opacity:.25;transform:translateX(-10px);}50%{opacity:.75;}100%{opacity:.25;transform:translateX(10px);}}"
    },
    "interaction_states": {
      "buttons": {
        "hover": "translateY(-1px) + glow tighten",
        "active": "scale(0.98)",
        "focus": "ring-2 ring-[hsl(var(--imba-red))] ring-offset-0"
      },
      "inputs": {
        "focus": "border becomes white/20 + red ring",
        "error": "shake 140ms + red border"
      }
    }
  },
  "widget_specs": {
    "score_widget": {
      "route": "/widget/score",
      "labels_language": "EN",
      "controls_language": "RU (panel)",
      "visual": {
        "layout": [
          "Left: WIN block (white number with subtle red rim glow)",
          "Center: STREAK block (muted; becomes active with red underline)",
          "Right: LOSE block (red number + stronger glow)"
        ],
        "states": [
          "WIN increment: number flip + white flash + thin red sweep line",
          "LOSE increment: number flip + red flash + micro glitch",
          "UNDO: quick reverse tick + dim pulse"
        ]
      },
      "implementation_notes": [
        "Use tabular numbers to prevent width jitter",
        "Prefer a digit-reel component (CSS translateY) or simple flip (rotateX) per update",
        "Expose a 'scale' query param for OBS (e.g., ?scale=1.0)"
      ],
      "testids": {
        "root": "score-widget-root",
        "win_value": "score-widget-win-value",
        "lose_value": "score-widget-lose-value",
        "streak_label": "score-widget-streak-label"
      }
    },
    "rank_widget": {
      "route": "/widget/rank",
      "labels_language": "EN",
      "visual": {
        "frames": "Two chamfered frames with inner border + tick marks; medals keep original PNG colors.",
        "center_lane": "Animated chevron arrows (calm flow) pointing right; only subtle motion allowed.",
        "immortal_place": "Gold text printed on plaque area; use text-shadow for readability."
      },
      "rank_change_animation": [
        "Medal glitch-in (opacity + translate + slight skew)",
        "Frame red flash (imbaFlash)",
        "Chevron lane briefly brightens then returns"
      ],
      "testids": {
        "root": "rank-widget-root",
        "current_medal": "rank-widget-current-medal",
        "goal_medal": "rank-widget-goal-medal",
        "current_label": "rank-widget-current-label",
        "goal_label": "rank-widget-goal-label"
      }
    }
  },
  "panel_specs": {
    "routes": ["/login", "/panel"],
    "login": {
      "layout": "Centered-left card (not full center text); big title + password input + submit.",
      "components": ["card.jsx", "input.jsx", "button.jsx"],
      "testids": {
        "password": "login-password-input",
        "submit": "login-submit-button",
        "error": "login-error-text"
      }
    },
    "panel_tabs": {
      "tabs": [
        {
          "name": "Счёт",
          "content": [
            "Live preview iframe/card of /widget/score",
            "Big actions: +WIN, +LOSE, UNDO (3-button row)",
            "Manual edit: two number inputs + Save",
            "Reset: destructive button with confirm dialog"
          ],
          "testids": {
            "win": "panel-score-win-button",
            "lose": "panel-score-lose-button",
            "undo": "panel-score-undo-button",
            "save": "panel-score-save-button",
            "reset": "panel-score-reset-button"
          }
        },
        {
          "name": "Звание",
          "content": [
            "Two medal pickers: CURRENT and GOAL",
            "Swap button",
            "Immortal place input (only when Immortal selected)",
            "Live preview of /widget/rank"
          ],
          "testids": {
            "current_picker": "panel-rank-current-picker",
            "goal_picker": "panel-rank-goal-picker",
            "swap": "panel-rank-swap-button",
            "immortal_place": "panel-rank-immortal-place-input"
          }
        },
        {
          "name": "Клавиши",
          "content": [
            "Hotkey recorder rows for WIN/LOSE/UNDO",
            "Conflict warning banner",
            "Helper status pill (online/offline)"
          ],
          "testids": {
            "win_hotkey": "panel-hotkeys-win-recorder",
            "lose_hotkey": "panel-hotkeys-lose-recorder",
            "undo_hotkey": "panel-hotkeys-undo-recorder",
            "conflict": "panel-hotkeys-conflict-warning",
            "status": "panel-hotkeys-helper-status"
          }
        },
        {
          "name": "OBS",
          "content": [
            "Two permanent URLs with copy buttons",
            "Recommended sizes",
            "3-step instructions",
            "Download AutoHotkey helper script button"
          ],
          "testids": {
            "score_url": "panel-obs-score-url",
            "rank_url": "panel-obs-rank-url",
            "copy_score": "panel-obs-copy-score-url-button",
            "copy_rank": "panel-obs-copy-rank-url-button",
            "download_ahk": "panel-obs-download-ahk-button"
          }
        }
      ]
    }
  },
  "css_scaffolds": {
    "obs_transparent_page": {
      "where": "/app/frontend/src/index.css",
      "css": "html, body { background: transparent !important; }\n#root { background: transparent !important; }"
    },
    "widget_plate_class": {
      "css": ".imba-plate{position:relative; background:rgba(10,10,12,.72); backdrop-filter:blur(6px); clip-path:polygon(0% 10px,10px 0%,calc(100% - 18px) 0%,100% 18px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0% calc(100% - 10px)); border:1px solid rgba(255,255,255,.10); box-shadow:0 0 0 1px rgba(255,26,46,.22) inset, 0 18px 60px rgba(0,0,0,.55);}\n.imba-plate::before{content:'';position:absolute;inset:0;pointer-events:none;clip-path:inherit;border:1px solid rgba(255,26,46,.35);opacity:.65;filter:drop-shadow(0 0 12px rgba(255,26,46,.22));}\n.imba-plate::after{content:'';position:absolute;left:14px;right:14px;top:12px;height:1px;background:repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 6px, transparent 6px 14px);opacity:.55;pointer-events:none;}"
    },
    "chevron_lane": {
      "css": ".imba-chevronLane{position:relative; height:100%; display:flex; align-items:center; justify-content:center;}\n.imba-chevron{width:56px;height:18px;opacity:.35;filter:drop-shadow(0 0 10px rgba(255,26,46,.25));animation:imbaChevron 1.6s ease-in-out infinite;}\n.imba-chevron:nth-child(2){animation-delay:.18s;opacity:.25;}\n.imba-chevron:nth-child(3){animation-delay:.36s;opacity:.18;}"
    }
  },
  "libraries": {
    "recommended": [
      {
        "name": "framer-motion",
        "why": "Crisp, controllable widget animations (glitch-in, flashes, digit transitions).",
        "install": "npm i framer-motion",
        "usage": "Use motion.div for medal swap + number flip; keep durations short (0.18–0.42s)."
      }
    ],
    "optional": [
      {
        "name": "react-use-measure",
        "why": "Measure container for responsive scaling inside OBS source.",
        "install": "npm i react-use-measure"
      }
    ]
  },
  "image_urls": {
    "textures_optional": [
      {
        "category": "subtle plate texture reference",
        "description": "Optional inspiration for background texture; do NOT use as full-page background in widgets.",
        "url": "https://images.pexels.com/photos/30547606/pexels-photo-30547606.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
      }
    ],
    "provided_references": [
      {
        "category": "brand frame reference",
        "description": "IMBA Cyber Club frame motif (chamfer corners, neon red lines, badge).",
        "url": "https://customer-assets-0z36b82j.emergentagent.net/job_3bba6836-2ddf-4e96-abcf-4f2da5727006/artifacts/b8e30ef84d7cbec9_111.png"
      },
      {
        "category": "BRB screen reference",
        "description": "Logo typography vibe (wide bold white).",
        "url": "https://customer-assets-0z36b82j.emergentagent.net/job_3bba6836-2ddf-4e96-abcf-4f2da5727006/artifacts/85201c66f804bff6_agent_generate_image_Premium_Twitch_stream_pause_BRB_screen_3840x2160.webp"
      }
    ]
  },
  "accessibility": {
    "rules": [
      "Maintain WCAG AA contrast in panel (white/90 on near-black).",
      "Always show visible focus rings (ring color = neon red).",
      "Respect prefers-reduced-motion: disable glitch/flip; keep only opacity changes.",
      "Buttons must have min height 40px on mobile."
    ]
  },
  "instructions_to_main_agent": {
    "implementation_priorities": [
      "1) Enforce transparent page background for /widget/* routes (html/body/root).",
      "2) Build reusable <ImbaPlate> wrapper with clip-path + border glow + ticks + noise overlay.",
      "3) Implement Score widget with digit animation + event-specific flash classes.",
      "4) Implement Rank widget with two frames + chevron lane + medal glitch-in.",
      "5) Panel: shadcn Tabs layout + live previews + data-testid everywhere.",
      "6) Avoid transition: all; only transition colors/opacity/shadow on interactive elements."
    ],
    "data_testid_rule": "All interactive and key informational elements MUST include data-testid in kebab-case describing role (not appearance).",
    "js_files_note": "Project uses .js; write components in React .js (not .tsx)."
  },
  "general_ui_ux_design_guidelines_appendix": "<General UI UX Design Guidelines>  \n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
