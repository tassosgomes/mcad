using System;
using System.Linq;

class Program {
    static void Main() {
        var rng = new Random();
        for(int i = 0; i < 20; i++) {
        var num = new int[9];
        for (int j = 0; j < 9; j++) num[j] = rng.Next(0, 9);
        
        var sum1 = 0;
        for (int j = 0; j < 9; j++) sum1 += num[j] * (10 - j);
        var res1 = sum1 % 11;
        var r1 = res1 < 2 ? 0 : 11 - res1;
        
        var sum2 = 0;
        for (int j = 0; j < 9; j++) sum2 += num[j] * (11 - j);
        sum2 += r1 * 2;
        var res2 = sum2 % 11;
        var r2 = res2 < 2 ? 0 : 11 - res2;
        
        Console.WriteLine($"{string.Join("", num)}{r1}{r2}");
        }
    }
}
