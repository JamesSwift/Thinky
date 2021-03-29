SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";
CREATE DATABASE IF NOT EXISTS `thinky` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `thinky`;

CREATE TABLE `addresses` (
  `id` int(11) NOT NULL,
  `pid` int(11) NOT NULL,
  `userID` int(11) DEFAULT NULL,
  `addressName` varchar(50) DEFAULT NULL,
  `addressTo` text DEFAULT NULL,
  `streetAddress` text NOT NULL,
  `town` text NOT NULL,
  `county` text DEFAULT NULL,
  `state` text DEFAULT NULL,
  `country` text NOT NULL,
  `postcode` text DEFAULT NULL,
  `archived` tinyint(1) NOT NULL DEFAULT 0,
  `created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `authCodes` (
  `id` bigint(20) NOT NULL,
  `uid` int(11) NOT NULL,
  `type` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `used` tinyint(1) DEFAULT NULL,
  `data` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `authorizedClients` (
  `clientID` bigint(20) NOT NULL,
  `businessID` int(11) NOT NULL,
  `authorizedBy` int(11) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `businesses` (
  `id` int(11) NOT NULL,
  `name` varchar(254) NOT NULL,
  `urlSafeName` varchar(255) NOT NULL,
  `logo` varchar(254) NOT NULL,
  `description` text NOT NULL,
  `owner` int(11) DEFAULT NULL,
  `vatRegistered` tinyint(4) NOT NULL DEFAULT 0,
  `public` tinyint(1) NOT NULL DEFAULT 0,
  `schedule` text DEFAULT NULL,
  `openUntil` datetime DEFAULT NULL,
  `closedUntil` datetime DEFAULT NULL,
  `deliveryOffered` tinyint(1) NOT NULL DEFAULT 0,
  `archived` tinyint(1) NOT NULL DEFAULT 0,
  `creadedBy` int(11) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `stripeUserID` text DEFAULT NULL,
  `stripeToken` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

INSERT INTO `businesses` (`id`, `name`, `urlSafeName`, `logo`, `description`, `owner`, `vatRegistered`, `public`, `schedule`, `openUntil`, `closedUntil`, `deliveryOffered`, `archived`, `creadedBy`, `created`, `stripeUserID`, `stripeToken`) VALUES
(1, 'Default Business', 'default', '', 'Default business for thinky example.', 1, 0, 1, '{\"monday\":{\"available\":true,\"times\":[{\"start\":\"0900\",\"finish\":\"1700\"}]},\"tuesday\":{\"available\":true,\"times\":[{\"start\":\"0015\",\"finish\":\"1700\"}]},\"wednesday\":{\"available\":true,\"times\":[{\"start\":\"0900\",\"finish\":\"1700\"}]},\"thursday\":{\"available\":true,\"times\":[{\"start\":\"0900\",\"finish\":\"1700\"}]},\"friday\":{\"available\":true,\"times\":[{\"start\":\"0900\",\"finish\":\"1700\"}]},\"saturday\":{\"available\":false,\"times\":[{\"start\":\"0000\",\"finish\":\"2400\"}]},\"sunday\":{\"available\":false,\"times\":[{\"start\":\"0000\",\"finish\":\"2400\"}]}}', NULL, NULL, 1, 0, NULL, '2019-05-01 15:01:29', NULL, NULL);

CREATE TABLE `clients` (
  `id` bigint(20) NOT NULL,
  `secret` char(64) NOT NULL,
  `name` varchar(140) NOT NULL,
  `last_active` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `emailQueue` (
  `id` bigint(20) NOT NULL,
  `to` text COLLATE utf8_unicode_ci NOT NULL,
  `subject` text CHARACTER SET latin1 DEFAULT NULL,
  `message` text CHARACTER SET latin1 DEFAULT NULL,
  `headers` text COLLATE utf8_unicode_ci DEFAULT NULL,
  `sendAfter` datetime DEFAULT NULL,
  `sendNow` tinyint(1) DEFAULT NULL,
  `from` text COLLATE utf8_unicode_ci DEFAULT NULL,
  `sent` datetime DEFAULT NULL,
  `ref` text COLLATE utf8_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `employeePermissions` (
  `userID` int(11) NOT NULL,
  `businessID` int(11) NOT NULL,
  `manageEmployees` tinyint(1) NOT NULL DEFAULT 0,
  `editMenu` tinyint(1) NOT NULL DEFAULT 0,
  `editIngredients` tinyint(1) NOT NULL DEFAULT 0,
  `manageOrders` tinyint(1) NOT NULL DEFAULT 0,
  `changeBusinessDetails` tinyint(1) NOT NULL DEFAULT 0,
  `editDeliveryPricing` tinyint(1) NOT NULL DEFAULT 0,
  `overrideSchedule` tinyint(1) NOT NULL DEFAULT 0,
  `authorizeClient` tinyint(1) NOT NULL DEFAULT 0,
  `connectStripeAccount` tinyint(1) NOT NULL DEFAULT 0,
  `viewUserInfo` tinyint(1) NOT NULL DEFAULT 0,
  `editUserInfo` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `nonce` (
  `value` varchar(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `expires` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `pids` (
  `pid` int(11) NOT NULL,
  `table` varchar(20) NOT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tokens` (
  `id` bigint(20) NOT NULL,
  `clientID` bigint(20) NOT NULL,
  `uid` varchar(64) NOT NULL,
  `secret` char(64) NOT NULL,
  `permissions` text NOT NULL,
  `expires` bigint(20) NOT NULL,
  `timeout` int(11) NOT NULL,
  `lastUsed` bigint(9) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `title` text DEFAULT NULL,
  `firstName` text DEFAULT NULL,
  `middleNames` text DEFAULT NULL,
  `lastName` text NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `verifiedEmail` varchar(255) DEFAULT NULL,
  `primaryPhoneNumber` text DEFAULT NULL,
  `secondaryPhoneNumber` text DEFAULT NULL,
  `defaultAddressPID` int(11) DEFAULT NULL,
  `password` varchar(254) DEFAULT NULL,
  `pin` varchar(64) DEFAULT NULL,
  `securityQuestion1` varchar(255) DEFAULT NULL,
  `securityAnswer1` varchar(255) DEFAULT NULL,
  `securityQuestion2` varchar(255) DEFAULT NULL,
  `securityAnswer2` varchar(255) DEFAULT NULL,
  `securityQuestion3` varchar(255) DEFAULT NULL,
  `securityAnswer3` varchar(255) DEFAULT NULL,
  `lastModified` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `addresses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `userID` (`userID`),
  ADD KEY `pid` (`pid`);

ALTER TABLE `authCodes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `uid` (`uid`);

ALTER TABLE `authorizedClients`
  ADD UNIQUE KEY `unique` (`clientID`,`businessID`) USING BTREE,
  ADD KEY `businessID` (`businessID`),
  ADD KEY `authoirzedBy` (`authorizedBy`),
  ADD KEY `clientID_2` (`clientID`) USING BTREE;

ALTER TABLE `businesses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `creadedBy` (`creadedBy`),
  ADD KEY `owner` (`owner`);

ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`);

ALTER TABLE `emailQueue`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`);

ALTER TABLE `employeePermissions`
  ADD PRIMARY KEY (`userID`,`businessID`) USING BTREE,
  ADD KEY `businessID` (`businessID`);

ALTER TABLE `nonce`
  ADD UNIQUE KEY `value` (`value`);

ALTER TABLE `pids`
  ADD PRIMARY KEY (`pid`),
  ADD UNIQUE KEY `pid` (`pid`),
  ADD KEY `createdBy` (`createdBy`);

ALTER TABLE `tokens`
  ADD UNIQUE KEY `id` (`id`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `pin` (`pin`),
  ADD KEY `defaultAddress` (`defaultAddressPID`);


ALTER TABLE `addresses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `authCodes`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

ALTER TABLE `businesses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

ALTER TABLE `clients`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

ALTER TABLE `emailQueue`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

ALTER TABLE `pids`
  MODIFY `pid` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tokens`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;


ALTER TABLE `addresses`
  ADD CONSTRAINT `addresses_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `addresses_ibfk_2` FOREIGN KEY (`pid`) REFERENCES `pids` (`pid`) ON UPDATE CASCADE;

ALTER TABLE `authCodes`
  ADD CONSTRAINT `authCodes_ibfk_1` FOREIGN KEY (`uid`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE `authorizedClients`
  ADD CONSTRAINT `authorizedClients_ibfk_1` FOREIGN KEY (`clientID`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `authorizedClients_ibfk_2` FOREIGN KEY (`businessID`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `authorizedClients_ibfk_3` FOREIGN KEY (`authorizedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `businesses`
  ADD CONSTRAINT `businesses_ibfk_1` FOREIGN KEY (`creadedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `employeePermissions`
  ADD CONSTRAINT `employeePermissions_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `employeePermissions_ibfk_2` FOREIGN KEY (`businessID`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE;

ALTER TABLE `pids`
  ADD CONSTRAINT `pids_ibfk_1` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`defaultAddressPID`) REFERENCES `pids` (`pid`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;
