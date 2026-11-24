import app.streakcalendar.WidgetData;
import java.nio.file.Files;
import java.nio.file.Paths;

public class ActionText {
    public static void main(String[] a) throws Exception {
        WidgetData d = WidgetData.parse(new String(Files.readAllBytes(Paths.get(a[0])), "UTF-8"));
        String today = a[1];
        StringBuilder sb = new StringBuilder();
        for (WidgetData.Habit h : d.habits) {
            String[] t = d.actionText(h, today);
            sb.append(h.id).append(" | ").append(t[0]).append(" | ").append(t[1]).append(" | ").append(t[2]).append(h.later ? " | later" : "").append('\n');
        }
        System.out.print(sb);
    }
}
