-- on: new seller shops wait for admin approval; off: they go live at once
ALTER TABLE "SiteSetting" ADD COLUMN "shopApproval" BOOLEAN NOT NULL DEFAULT true;
