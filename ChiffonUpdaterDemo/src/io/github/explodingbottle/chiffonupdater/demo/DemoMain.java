/*
 * This file is part of ChiffonUpdater
 *
 * SPDX-License-Identifier: MIT
 */

package io.github.explodingbottle.chiffonupdater.demo;

import java.io.File;
import java.net.URISyntaxException;

import javax.swing.JOptionPane;

import io.github.explodingbottle.chiffonupdater.ChiffonUpdaterTool;

public class DemoMain {

	private static final String VERSION = "1.0";
	private static final boolean SETTING_LOG_ENABLED = false;

	public static void main(String[] args) {
		ChiffonUpdaterTool updaterTool = new ChiffonUpdaterTool(SETTING_LOG_ENABLED);
		boolean registerFailed = true;
		try {
			if (updaterTool.initialize()) {
				updaterTool.registerProgram(
						new File(DemoMain.class.getProtectionDomain().getCodeSource().getLocation().toURI()));
				registerFailed = false;
			}
		} catch (URISyntaxException e) {

		}
		if (registerFailed) {
			JOptionPane.showMessageDialog(null, "Could't register myself.", "Demo", JOptionPane.WARNING_MESSAGE);
		}
		JOptionPane.showMessageDialog(null, "Hello! This is Demo version " + VERSION, "Demo",
				JOptionPane.INFORMATION_MESSAGE);
	}

}
