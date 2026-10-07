using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        try
        {
            string dir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            string script = Path.Combine(dir, "SetupForm.ps1");
            if (!File.Exists(script))
            {
                MessageBox.Show(
                    "SetupForm.ps1 was not found next to CompanyLaptopAgent-Setup.exe.",
                    "Company Laptop Agent Setup",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                return;
            }

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = "powershell.exe";
            psi.Arguments = "-STA -NoProfile -ExecutionPolicy Bypass -File \"" + script + "\"";
            psi.WorkingDirectory = dir;
            psi.UseShellExecute = true;
            Process.Start(psi);
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "Company Laptop Agent Setup", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
