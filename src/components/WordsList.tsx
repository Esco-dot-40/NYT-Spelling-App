import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface WordsListProps {
  words: string[];
  pangrams: string[];
}

export const WordsList = ({ words, pangrams }: WordsListProps) => {
  const sortedWords = [...words].sort();

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm h-fit md:sticky md:top-8">
      <h3 className="text-xl font-bold text-game-text mb-4">
        Your Words ({words.length})
      </h3>

      {words.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No words found yet. Start spelling!
        </p>
      ) : (
        <ScrollArea className="h-[250px] md:h-[400px] pr-4">
          <div className="space-y-2">
            {sortedWords.map((word, index) => {
              const isPangram = pangrams.includes(word.toLowerCase());
              return (
                <div
                  key={`${word}-${index}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <span className="uppercase font-medium text-game-text">
                    {word}
                  </span>
                  {isPangram && (
                    <Badge className="bg-primary text-primary-foreground">
                      Pangram!
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
};
