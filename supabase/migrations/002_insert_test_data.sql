-- Insert 20 test products
INSERT INTO products (name, slug, description, category, price_fcfa, availability, specs, tags) VALUES
('CacaoBook 14', 'cacaobook-14', 'Ultrabook performant pour professionnels', 'portable', 385000, 'in_stock', '{"cpu": "Intel i5", "ram": "16 Go", "storage": "512 Go SSD", "screen": "14\"", "weight": "1.4 kg"}', '{"portable", "professionnel"}'),
('CacaoBook Pro 15', 'cacaobook-pro-15', 'Laptop haute performance pour gaming', 'portable', 545000, 'in_stock', '{"cpu": "AMD Ryzen 7", "ram": "16 Go", "storage": "1 To SSD", "screen": "15.6\"", "weight": "1.8 kg"}', '{"portable", "gaming"}'),
('TourVolt X1', 'tourvolt-x1', 'Ordinateur de bureau gaming', 'bureau', 610000, 'in_stock', '{"cpu": "Intel i7", "ram": "32 Go", "storage": "1 To SSD", "gpu": "RTX 4070"}', '{"bureau", "gaming"}'),
('CacaoBook Air 13', 'cacaobook-air-13', 'Ultraportable léger et élégant', 'portable', 265000, 'on_order', '{"cpu": "Intel i3", "ram": "8 Go", "storage": "256 Go SSD", "screen": "13.3\""}', '{"portable", "entry-level"}'),
('TourVolt Mini', 'tourvolt-mini', 'Compact de bureau pour small office', 'bureau', 340000, 'in_stock', '{"cpu": "Intel i5", "ram": "16 Go", "storage": "512 Go SSD"}', '{"bureau", "compact"}'),
('CacaoBook Studio 16', 'cacaobook-studio-16', 'Station de travail portative', 'portable', 780000, 'in_stock', '{"cpu": "AMD Ryzen 9", "ram": "32 Go", "storage": "1 To SSD", "screen": "16\""}', '{"portable", "professionnel"}'),
('CacaoBook 15 Lite', 'cacaobook-15-lite', 'Portable d''entrée de gamme', 'portable', 298000, 'in_stock', '{"cpu": "Intel i5", "ram": "8 Go", "storage": "256 Go SSD", "screen": "15.6\""}', '{"portable", "entry-level"}'),
('TourVolt Compact', 'tourvolt-compact', 'Mini PC de bureau compacte', 'bureau', 375000, 'in_stock', '{"cpu": "Intel i5", "ram": "16 Go", "storage": "512 Go SSD"}', '{"bureau", "compact"}'),
('CacaoBook Max', 'cacaobook-max', 'Laptop tout en puissance', 'portable', 950000, 'on_order', '{"cpu": "Intel i9", "ram": "64 Go", "storage": "2 To SSD", "screen": "17\""}', '{"portable", "gaming", "professionnel"}'),
('TourVolt Pro Desk', 'tourvolt-pro-desk', 'Station de travail haute performance', 'bureau', 1200000, 'in_stock', '{"cpu": "Intel Xeon", "ram": "64 Go", "storage": "2 To SSD"}', '{"bureau", "professionnel"}'),
('CacaoBook Slim', 'cacaobook-slim', 'Portable ultra-fin et léger', 'portable', 420000, 'in_stock', '{"cpu": "AMD Ryzen 5", "ram": "16 Go", "storage": "512 Go SSD", "weight": "1.2 kg"}', '{"portable", "ultrabook"}'),
('TourVolt Gaming Hub', 'tourvolt-gaming-hub', 'Desktop gaming puissant', 'bureau', 850000, 'in_stock', '{"cpu": "Intel i9", "ram": "32 Go", "storage": "1 To SSD", "gpu": "RTX 4090"}', '{"bureau", "gaming"}'),
('CacaoBook Business', 'cacaobook-business', 'Portable pour professionnels', 'portable', 580000, 'in_stock', '{"cpu": "Intel i7", "ram": "16 Go", "storage": "512 Go SSD", "screen": "15.6\""}', '{"portable", "professionnel"}'),
('TourVolt Office Basic', 'tourvolt-office-basic', 'Ordinateur de bureau bureautique', 'bureau', 280000, 'in_stock', '{"cpu": "Intel i3", "ram": "8 Go", "storage": "256 Go SSD"}', '{"bureau", "entry-level"}'),
('CacaoBook Plus', 'cacaobook-plus', 'Portable milieu de gamme', 'portable', 450000, 'in_stock', '{"cpu": "AMD Ryzen 7", "ram": "16 Go", "storage": "512 Go SSD", "screen": "15.6\""}', '{"portable", "mid-range"}'),
('TourVolt Creator', 'tourvolt-creator', 'Station créative multimédia', 'bureau', 920000, 'in_stock', '{"cpu": "AMD Ryzen 9", "ram": "48 Go", "storage": "2 To SSD", "gpu": "RTX 4080"}', '{"bureau", "creation"}'),
('CacaoBook Lite Mini', 'cacaobook-lite-mini', 'Portable très compact', 'portable', 220000, 'on_order', '{"cpu": "Intel Celeron", "ram": "4 Go", "storage": "128 Go SSD", "weight": "0.9 kg"}', '{"portable", "entry-level"}'),
('TourVolt Home', 'tourvolt-home', 'PC familial polyvalent', 'bureau', 320000, 'in_stock', '{"cpu": "Intel i5", "ram": "8 Go", "storage": "512 Go SSD"}', '{"bureau", "family"}'),
('CacaoBook Edge', 'cacaobook-edge', 'Portable gaming portable', 'portable', 750000, 'in_stock', '{"cpu": "Intel i9", "ram": "32 Go", "storage": "1 To SSD", "screen": "15.6\"", "gpu": "RTX 4070"}', '{"portable", "gaming"}'),
('TourVolt Pro Mobile', 'tourvolt-pro-mobile', 'Mini ordinateur portable professionnel', 'bureau', 560000, 'in_stock', '{"cpu": "AMD Ryzen 7", "ram": "32 Go", "storage": "1 To SSD"}', '{"bureau", "mobile"}');

-- Insert 5 Yango delivery cities
INSERT INTO shipping_fees (city, fee_fcfa) VALUES
('Abidjan', 5000),
('Bouaké', 8000),
('Yamoussoukro', 7500),
('San-Pédro', 9000),
('Daloa', 8500);
