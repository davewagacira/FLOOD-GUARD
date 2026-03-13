DELETE FROM "sms_recipients"
WHERE REPLACE("phoneNumber", '+', '') NOT IN ('254112228206', '254703100790');

INSERT INTO "sms_recipients" ("id", "phoneNumber", "locationId", "zoneId", "createdAt")
SELECT 'approved-mathare-01', '254112228206', "locationId", "id", NOW()
FROM "flood_zones"
WHERE "name" ILIKE '%Mathare%'
AND NOT EXISTS (
    SELECT 1
    FROM "sms_recipients"
    WHERE REPLACE("phoneNumber", '+', '') = '254112228206'
);

INSERT INTO "sms_recipients" ("id", "phoneNumber", "locationId", "zoneId", "createdAt")
SELECT 'approved-kibera-01', '254703100790', "locationId", "id", NOW()
FROM "flood_zones"
WHERE "name" ILIKE '%Kibera%'
AND NOT EXISTS (
    SELECT 1
    FROM "sms_recipients"
    WHERE REPLACE("phoneNumber", '+', '') = '254703100790'
);
