-- GreenLink seed data (mirrors assignment/src/data from Step 10)

BEGIN;

INSERT INTO categories (id, name, description) VALUES
  ('tree-planting', 'Tree Planting', 'Establishing native trees and large shrubs to grow Greater Melbourne''s urban forest canopy.'),
  ('community-garden', 'Community Garden', 'Shared neighbourhood gardens where residents grow food, natives and connections together.'),
  ('habitat-restoration', 'Habitat Restoration', 'Rebuilding indigenous understorey and ground-layer habitat for local birds, insects and small fauna.'),
  ('pollinator-corridor', 'Pollinator Corridor', 'Linking patches of nectar-rich native plantings so bees, butterflies and honeyeaters can move through the city.'),
  ('waterway-care', 'Waterway Care', 'Protecting and revegetating creeks, rivers and wetlands across the Yarra and Maribyrnong catchments.'),
  ('green-roof-wall', 'Green Roof & Wall', 'Turning rooftops and bare walls into living infrastructure that cools the city and slows stormwater.');

INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
  ('maya.thompson@greenlink.org.au', '$2b$10$seedplaceholderhashvalueforlocaldevonly1', 'Maya', 'Thompson', 'admin'),
  ('arjun.patel@example.com',         '$2b$10$seedplaceholderhashvalueforlocaldevonly2', 'Arjun', 'Patel', 'member'),
  ('chloe.zhang@example.com',         '$2b$10$seedplaceholderhashvalueforlocaldevonly3', 'Chloe', 'Zhang', 'member');

INSERT INTO plants
  (common_name, scientific_name, description, image, habitat, maintenance_level)
VALUES
  ('Silver Wattle', 'Acacia dealbata',
   'Fast-growing wattle with silvery fern-like foliage and masses of golden ball flowers in late winter, feeding early pollinators.',
   '/images/plants/silver-wattle.jpg',
   'Moist valleys and creek lines in foothill forest', 'low'),
  ('Black Wattle', 'Acacia mearnsii',
   'Tall wattle with dark bark and pale lemon flower spikes; excellent nurse tree for revegetation sites and nitrogen-poor soils.',
   '/images/plants/black-wattle.jpg',
   'Open forest and cleared margins across greater Melbourne', 'low'),
  ('Sweet Bursaria', 'Bursaria spinosa',
   'Prickly shrub crowned with sweet-scented white summer flowers; its dense thorns shelter small birds such as the superb fairy-wren.',
   '/images/plants/sweet-bursaria.jpg',
   'Woodlands, grassy slopes and regenerating bushland', 'low'),
  ('Kangaroo Grass', 'Themeda triandra',
   'Signature tussock grass of Melbourne''s volcanic plains, turning copper-red in autumn and seeding for granivorous birds.',
   '/images/plants/kangaroo-grass.jpg',
   'Native grasslands and open woodland understorey', 'low'),
  ('Common Tussock-Grass', 'Poa labillardierei',
   'Fine-leaved blue-green tussock that thrives in wet soils, stabilising creek banks and providing frog habitat along waterways.',
   '/images/plants/common-tussock-grass.jpg',
   'Damp gullies, creek banks and wetland edges', 'medium'),
  ('Manna Gum', 'Eucalyptus viminalis',
   'Stately koala feed tree with ribboning bark and long white ribbons of manna; supports the Yarra Bend flying-fox camp.',
   '/images/plants/manna-gum.jpg',
   'River flats and fertile valley slopes near watercourses', 'medium'),
  ('Yellow Gum', 'Eucalyptus leucoxylon',
   'Medium gum with cream-to-pink winter flowers that drip nectar for honeyeaters, lorikeets and urban beehives.',
   '/images/plants/yellow-gum.jpg',
   'Dry ridges and streetscapes on shallow soils', 'low'),
  ('Spiny-headed Mat-rush', 'Lomandra longifolia',
   'Strappy evergreen rush that tolerates drought and pollution alike; a workhorse plant for raingardens and green roofs.',
   '/images/plants/spiny-headed-mat-rush.jpg',
   'Sandy soils, rocky outcrops and drainage lines', 'low'),
  ('Karkalla', 'Carpobrotus rossii',
   'Ground-hugging succulent with magenta daisy flowers and edible salty fruit; binds dune sand on coastal foreshores.',
   '/images/plants/karkalla.jpg',
   'Coastal dunes, cliffs and exposed headlands', 'low'),
  ('Chocolate Lily', 'Arthropodium strictum',
   'Bulbous lily with chocolate-scented purple flowers that dots grasslands each spring and suits cottage-style native borders.',
   '/images/plants/chocolate-lily.jpg',
   'Grassy woodlands and remnant plains grassland', 'medium'),
  ('Woolly Tea-tree', 'Leptospermum lanigerum',
   'Soft grey-foliaged tea-tree with white spring flowers; thrives in soggy ground and thickens up wetland buffer plantings.',
   '/images/plants/woolly-tea-tree.jpg',
   'Swampy heath and stream margins', 'medium'),
  ('Common Everlasting', 'Chrysocephalum apiculatum',
   'Golden paper-daisy groundcover that flowers for months, drawing hoverflies and butterflies into sunny garden beds.',
   '/images/plants/common-everlasting.jpg',
   'Open grassland, roadside verges and rockery pockets', 'low');

INSERT INTO projects
  (title, description, category_id, location, latitude, longitude, image,
   start_date, end_date, capacity, status, created_by)
VALUES
  ('Royal Park Canopy Revival',
   'Plant 400 indigenous trees across the degraded northern edge of Royal Park to restore canopy cover and shade the shared walking trail.',
   'tree-planting', 'Royal Park, Parkville', -37.851500, 144.951000,
   '/images/projects/royal-park-canopy-revival.jpg',
   '2026-05-16', '2026-07-26', 120, 'active', 1),
  ('Merri Creek Understorey Rescue',
   'Replace invasive blackberry and ivy along a 600 m stretch of Merri Creek with native grasses, lilies and shrubs that shelter superb fairy-wrens.',
   'habitat-restoration', 'Merri Creek, Brunswick East', -37.776200, 144.995800,
   '/images/projects/merri-creek-understorey-rescue.jpg',
   '2026-04-11', '2026-09-19', 80, 'active', 2),
  ('Westgate Park Saltmarsh Wetlands',
   'Rehabilitate the artificial wetland basins at Westgate Park by planting salt-tolerant natives that filter stormwater before it reaches the Yarra.',
   'waterway-care', 'Westgate Park, Port Melbourne', -37.838300, 144.908100,
   '/images/projects/westgate-park-saltmarsh-wetlands.jpg',
   '2026-02-21', '2026-06-14', 60, 'completed', 1),
  ('Docklands Rooftop Meadow Trial',
   'Convert 800 m2 of unused office rooftop into a drought-hardy native meadow to cool the building and feed city pollinators.',
   'green-roof-wall', 'Collins Street, Docklands', -37.817700, 144.945600,
   '/images/projects/docklands-rooftop-meadow-trial.jpg',
   '2026-08-08', '2026-11-28', 40, 'planned', 3),
  ('Fitzroy Gardens Heritage Border',
   'Replant the heritage border beds with Victorian natives that bloom through summer while staying true to the gardens'' 19th-century layout.',
   'community-garden', 'Fitzroy Gardens, East Melbourne', -37.813600, 144.975200,
   '/images/projects/fitzroy-gardens-heritage-border.jpg',
   '2026-03-07', '2026-10-31', 50, 'active', 2),
  ('Birrarung Marr Nectar Trail',
   'Create a continuous nectar corridor along the Birrarung Marr riverbank so honeyeaters can forage from Federation Bells to Batman Avenue.',
   'pollinator-corridor', 'Birrarung Marr, Melbourne CBD', -37.819900, 144.967300,
   '/images/projects/birrarung-marr-nectar-trail.jpg',
   '2026-06-06', '2026-12-12', 90, 'planned', 1),
  ('CERES Bush Food Kitchen Garden',
   'Expand CERES'' bush food garden with muntries, finger limes and native mint tended by volunteers and local school groups.',
   'community-garden', 'CERES Environment Park, Brunswick East', -37.775700, 144.996400,
   '/images/projects/ceres-bush-food-kitchen-garden.jpg',
   '2026-01-24', '2026-05-30', 70, 'completed', 3),
  ('St Kilda Foreshore Dune Stabilisation',
   'Plant spinifex and pigface along the St Kilda foreshore to hold shifting sand in place and protect penguin habitat at the breakwater.',
   'habitat-restoration', 'St Kilda Foreshore, St Kilda', -37.867800, 144.974200,
   '/images/projects/st-kilda-foreshore-dune-stabilisation.jpg',
   '2026-09-05', '2027-02-27', 100, 'planned', 2),
  ('Yarra Bend Flying-Fox Buffer',
   'Grow a dense buffer of flowering eucalypts and wattles around the Yarra Bend grey-headed flying-fox camp to reduce conflict with neighbouring residents.',
   'tree-planting', 'Yarra Bend Park, Kew', -37.797900, 145.012300,
   '/images/projects/yarra-bend-flying-fox-buffer.jpg',
   '2026-04-18', '2026-08-22', 110, 'active', 1);

INSERT INTO project_participations (project_id, user_id, role) VALUES
  (1, 1, 'organiser'), (1, 2, 'volunteer'),
  (2, 2, 'organiser'), (2, 3, 'volunteer'),
  (3, 1, 'organiser'),
  (5, 3, 'organiser'), (5, 1, 'volunteer'),
  (7, 3, 'organiser'),
  (9, 1, 'organiser'), (9, 3, 'volunteer');

INSERT INTO project_plants (project_id, plant_id, quantity) VALUES
  (1, 6, 180), (1, 7, 120), (1, 1, 100),
  (2, 4, 400), (2, 10, 250), (2, 12, 300), (2, 3, 80),
  (3, 11, 150), (3, 5, 200),
  (4, 8, 350), (4, 10, 120),
  (5, 10, 90), (5, 12, 140),
  (6, 7, 60), (6, 3, 40), (6, 12, 200),
  (7, 9, 25), (7, 10, 30),
  (8, 9, 500),
  (9, 1, 150), (9, 6, 80), (9, 2, 60);

COMMIT;
