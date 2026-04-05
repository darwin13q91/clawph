-- Step 1: Wipe all existing contacts and deals
DELETE FROM contacts;
DELETE FROM deals;

-- Step 2: Insert all 22 Amazon FBA seller prospects
-- Using placeholder emails for contacts without real emails (email is NOT NULL + UNIQUE)
INSERT INTO contacts (name, email, phone, company, source, created_at) VALUES
('Travis Marziani', 'travis@fbasellergy.com', NULL, 'Travis Marziani', 'YouTube case study', datetime('now')),
('Phil (OA Seller)', 'phil@mentorshipprogram.com', NULL, 'Phil OA', 'YouTube/mentorship', datetime('now')),
('Kade', 'kade-pl@fba.unknown', NULL, 'Kade Private Label', 'Reddit/YouTube', datetime('now')),
('Dan Rogers', 'dan-rogers@fba.unknown', NULL, 'Dan Rogers FBA', 'YouTube tutorial', datetime('now')),
('Andrew Engle', 'andrew-engle-pl@fba.unknown', NULL, 'Andrew Engle PL', 'Helium 10 podcast', datetime('now')),
('Michael Austin', 'michael-austin@fba.unknown', NULL, 'Michael Austin FBA', 'Article', datetime('now')),
('Dyson Allen', 'dyson-allen@fba.unknown', NULL, 'Dyson Allen FBA', 'YouTube', datetime('now')),
('Gavin', 'gavin-oara@fba.unknown', NULL, 'Gavin OA/RA', 'YouTube interview', datetime('now')),
('Jeremy', 'jeremy-oara@fba.unknown', NULL, 'Jeremy OA/RA', 'Mentorship case study', datetime('now')),
('Gilbert the Electrician', 'gilbert@email.com', NULL, 'Gilbert FBA', 'Journey interview', datetime('now')),
('Yassin Hall', 'yassin-hall@fba.unknown', NULL, 'Yassin Hall FBA', 'Interview', datetime('now')),
('Avi', 'avi-fba@fba.unknown', NULL, 'Avi FBA', 'Mentorship case study', datetime('now')),
('Jay (Student)', 'jay-student@fba.unknown', NULL, 'Jay FBA', 'Mentorship case study', datetime('now')),
('Anonymous Texas Seller', 'texas-seller@reddit.unknown', NULL, 'Texas OA/RA', 'Reddit r/AmazonFBA', datetime('now')),
('David & Ryan Ledbetter', 'ledbetter@fba.unknown', NULL, 'Ledbetter Wholesale/PL', 'Helium 10 success story', datetime('now')),
('Schrone', 'schrone-pl@fba.unknown', NULL, 'Schrone PL', 'Helium 10 case study', datetime('now')),
('Anne Ferris', 'anne-ferris@fba.unknown', NULL, 'Anne Ferris PL', 'Helium 10 case study', datetime('now')),
('RAYCorp', 'raycorp@fba.unknown', NULL, 'RAYCorp', 'eComEngine Seller of the Year', datetime('now')),
('Kate Farms', 'kate-farms@fba.unknown', NULL, 'Kate Farms', 'eComEngine New Seller Award', datetime('now')),
('Cryo Concepts', 'cryo-concepts@fba.unknown', NULL, 'Cryo Concepts', 'EcomOptimization case study', datetime('now')),
('Home & Kitchen Brand', 'homekitchen-brand@fba.unknown', NULL, 'Home & Kitchen brand', 'FBA Origin case study', datetime('now')),
('MaryRuth''s Organics', 'maryruths@fba.unknown', NULL, 'MaryRuths Organics', 'Jungle Scout case study', datetime('now'));

-- Step 3: Create deals linked to contacts
INSERT INTO deals (contact_id, title, value, stage, notes, created_at) VALUES
(1, 'Travis Marziani - Amajungle', 2997, 'new_lead', 'Amazon FBA, $100k+/mo rev, $50k+ profit/mo. Active case study sharer.', datetime('now')),
(2, 'Phil - Amajungle', 1997, 'new_lead', 'OA seller, $100k/mo in 90 days. Has mentorship program.', datetime('now')),
(3, 'Kade - Amajungle', 997, 'new_lead', 'Private label, 15+ products, $50k+/mo.', datetime('now')),
(4, 'Dan Rogers - Amajungle', 997, 'new_lead', '$30-50k/mo, 34% margin. YouTube tutorial.', datetime('now')),
(5, 'Andrew Engle - Amajungle', 2997, 'new_lead', '$267k/mo, 90% Amazon NA. Helium 10 podcast.', datetime('now')),
(6, 'Michael Austin - Amajungle', 997, 'new_lead', 'Full-time professor, $100k+ total revenue.', datetime('now')),
(7, 'Dyson Allen - Amajungle', 1997, 'new_lead', '19yo, $100k+/mo. OA/RA. YouTube.', datetime('now')),
(8, 'Gavin - Amajungle', 997, 'new_lead', 'Started age 21, 0 to 7-figures in ~2 years.', datetime('now')),
(9, 'Jeremy - Amajungle', 997, 'new_lead', '$10k/mo profit, part-time, 8 months. OA+RA.', datetime('now')),
(10, 'Gilbert the Electrician - Amajungle', 997, 'new_lead', '$10k/mo. Journey interview subject.', datetime('now')),
(11, 'Yassin Hall - Amajungle', 997, 'new_lead', 'Books to general FBA, $10k+/mo.', datetime('now')),
(12, 'Avi - Amajungle', 997, 'new_lead', 'Former IT pro, $10k/mo sales in 45 days.', datetime('now')),
(13, 'Jay - Amajungle', 497, 'new_lead', '21yo student, $10k/mo as of Mar 2025.', datetime('now')),
(14, 'Anonymous Texas Seller - Amajungle', 997, 'new_lead', '$50k/mo (7-month scale). Reddit.', datetime('now')),
(15, 'David & Ryan Ledbetter - Amajungle', 1997, 'new_lead', '$100k/mo sales. Wholesale/PL.', datetime('now')),
(16, 'Schrone - Amajungle', 997, 'new_lead', 'Single-product PL, $225k gross (2019).', datetime('now')),
(17, 'Anne Ferris - Amajungle', 997, 'new_lead', 'Premium PL, left 6-figure salary for 6-figure lifestyle.', datetime('now')),
(18, 'RAYCorp - Amajungle', 1997, 'new_lead', 'Top Seller Award 2024. Category undisclosed.', datetime('now')),
(19, 'Kate Farms - Amajungle', 1997, 'new_lead', 'Health & wellness. New Seller Award 2024.', datetime('now')),
(20, 'Cryo Concepts - Amajungle', 1997, 'new_lead', 'Health & Beauty, $100k+/mo new sales.', datetime('now')),
(21, 'Home & Kitchen Brand - Amajungle', 997, 'new_lead', '$100k+ rev in 5 months. FBA Origin case study.', datetime('now')),
(22, 'MaryRuth''s Organics - Amajungle', 1997, 'new_lead', 'Health & wellness, 27% revenue growth on Amazon.', datetime('now'));
