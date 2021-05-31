CREATE TABLE IF NOT EXISTS `messageData` (
    `content` VARCHAR(2000) CHARACTER SET utf16 COLLATE utf16_unicode_ci NOT NULL
);

CREATE TABLE IF NOT EXISTS `attributeData` (
    `hash` CHAR(32) CHARACTER SET ascii NOT NULL,
    PRIMARY KEY (`hash`)
);

CREATE TABLE IF NOT EXISTS `dontDM` (
    `userId` VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS `settings` (
    `guildId` VARCHAR(20) NOT NULL,
    `muteOnViolation` BOOLEAN NOT NULL DEFAULT 1,
    `muteDecayTime` FLOAT NOT NULL DEFAULT 6.0,
    `prefix` VARCHAR(3) CHARACTER SET utf16 COLLATE utf16_unicode_ci NOT NULL DEFAULT '&',
    PRIMARY KEY (`guildId`)
);

CREATE TABLE IF NOT EXISTS `mutes` (
    `guildId` VARCHAR(20) NOT NULL,
    `userId` VARCHAR(20) NOT NULL,
    `start` TIMESTAMP NULL DEFAULT NULL,
    `lastUpdate` TIMESTAMP NOT NULL,
    `time` INT UNSIGNED NULL DEFAULT NULL,
    `streak` TINYINT UNSIGNED DEFAULT 0, 
    PRIMARY KEY (`guildId`, `userId`)
);

CREATE TABLE IF NOT EXISTS `channels` (
	`guildId` VARCHAR(20) NOT NULL,
    `channelId` VARCHAR(20) NOT NULL,
    PRIMARY KEY (`guildId`, `channelid`)
);

DROP PROCEDURE IF EXISTS selectAndUpdate;
CREATE PROCEDURE selectAndUpdate(
	IN messageData VARCHAR(2000) CHARACTER SET utf16 COLLATE utf16_unicode_ci, 
    IN id VARCHAR(20)
)
BEGIN
    IF EXISTS(SELECT * FROM `messageData` WHERE `content` = messageData LIMIT 1) THEN
        SET @selQueryString = CONCAT("SELECT `", id, "` FROM `messageData` WHERE `content` = ? LIMIT 1");
        SET @messageData = messageData;
        PREPARE selectStatement FROM @selQueryString;
        EXECUTE selectStatement USING @messageData;
        DEALLOCATE PREPARE selectStatement;
        SET @updQueryString = CONCAT("UPDATE `messageData` SET `", id, "` = 1 WHERE `content` = ?");
        PREPARE updateStatement FROM @updQueryString;
        EXECUTE updateStatement USING @messageData;  
        DEALLOCATE PREPARE updateStatement ;
    ELSE
        SET @insQueryString = CONCAT("INSERT INTO `messageData` (`content`,`", id,"`) VALUES (?,1)");
        SET @messageData = messageData;
        PREPARE insertStatement FROM @insQueryString;
        EXECUTE insertStatement  USING @messageData;
        DEALLOCATE PREPARE insertStatement;
        SELECT 0;
    END IF;
END;
