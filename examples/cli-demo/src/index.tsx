import React, { useState, useEffect } from "react";
import { render, Text, Box, useInput, useApp } from "ink";
import SelectInput from "ink-select-input";
import { Rune } from "@inkscii/ascii";

// Import some animations (using the smaller .s.rune.json versions for better terminal performance)
import fire from "@inkscii/animations/fire.s.rune.json";
import ghost from "@inkscii/animations/ghost.s.rune.json";
import saturn from "@inkscii/animations/saturn.s.rune.json";
import earth from "@inkscii/animations/earth1.s.rune.json";
import coin from "@inkscii/animations/coin.s.rune.json";
import error from "@inkscii/animations/error.s.rune.json";

const animations: Record<string, any> = {
  fire,
  ghost,
  saturn,
  earth,
  coin,
  error,
};

const Demo = () => {
  const { exit } = useApp();
  const [selected, setSelected] = useState("fire");
  const [colored, setColored] = useState(true);

  const items = Object.keys(animations).map((key) => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: key,
  }));

  useInput((input, key) => {
    if (input === "q") {
      exit();
    }
    if (input === "c") {
      setColored(!colored);
    }
  });

  const handleSelect = (item: { value: string }) => {
    setSelected(item.value);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Inkscii CLI Demo
        </Text>
      </Box>

      <Box flexDirection="row">
        <Box flexDirection="column" width={30} borderStyle="round" paddingX={1}>
          <Text color="yellow" bold>
            Select Animation:
          </Text>
          <SelectInput items={items} onSelect={handleSelect} />
          <Box marginTop={1}>
            <Text dimColor>Press 'c' to toggle color</Text>
            <Text dimColor>Press 'q' to quit</Text>
          </Box>
        </Box>

        <Box
          flexGrow={1}
          borderStyle="double"
          paddingX={2}
          justifyContent="center"
          alignItems="center"
          minHeight={20}
        >
          <Rune animation={animations[selected]} colored={colored} />
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text italic dimColor>
          Selected: {selected} | Colors: {colored ? "On" : "Off"}
        </Text>
      </Box>
    </Box>
  );
};

render(<Demo />);
